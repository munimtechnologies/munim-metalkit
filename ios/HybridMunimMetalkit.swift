import Foundation
import Metal
import MetalKit
import NitroModules
import QuartzCore

/// The `MunimMetalkit` Nitro HybridObject.
///
/// Every async method validates and copies its JavaScript arguments synchronously (ArrayBuffers
/// from JavaScript are only valid during the call) and then runs off the JavaScript thread.
/// View-control methods run on the main thread. Errors carry a `[ERR_...]` code prefix that the
/// TypeScript wrapper turns into `error.code`.
///
/// `@unchecked Sendable`: every stored property is an immutable reference to the lock-protected
/// `MetalStore` or to the thread-safe MTLDevice/MTLCommandQueue holder.
final class HybridMunimMetalkit: HybridMunimMetalkitSpec, @unchecked Sendable {
  private let context = MetalContext.shared
  private let store = MetalStore.shared
  private var textures: ResourceRegistry<MTLTexture> { store.textures }
  private var buffers: ResourceRegistry<MTLBuffer> { store.buffers }
  private var libraries: ResourceRegistry<MTLLibrary> { store.libraries }
  private var computePipelines: ResourceRegistry<MTLComputePipelineState> { store.computePipelines }
  private var renderPipelines: ResourceRegistry<RenderPipelineEntry> { store.renderPipelines }
  /// Resources are tagged with the instance that created them (see `ResourceRegistry`).
  private var owner: ObjectIdentifier { ObjectIdentifier(self) }

  deinit {
    // Views keep strong references to whatever they bound, so they keep drawing.
    store.removeAll(owner: ObjectIdentifier(self))
  }

  // MARK: Device

  func isMetalAvailable() throws -> Bool {
    return context.device != nil
  }

  func getDeviceInfo() throws -> Promise<NativeDeviceInfo> {
    return runAsync {
      let device = try self.context.requireDevice()
      let threads = device.maxThreadsPerThreadgroup
      return NativeDeviceInfo(
        name: device.name,
        maxThreadsPerThreadgroup: NativeSize(
          width: Double(threads.width), height: Double(threads.height), depth: Double(threads.depth)),
        maxThreadgroupMemoryLength: Double(device.maxThreadgroupMemoryLength),
        maxBufferLength: Double(device.maxBufferLength),
        recommendedMaxWorkingSetSize: Double(device.recommendedMaxWorkingSetSize),
        hasUnifiedMemory: device.hasUnifiedMemory,
        gpuFamilies: GPUFamilies.supportedAppleFamilies(device))
    }
  }

  func getMetalCapabilities() throws -> Promise<NativeMetalCapabilities> {
    return runAsync {
      let device = try self.context.requireDevice()
      return MetalCapabilityProbe.nativeReport(device: device)
    }
  }

  // MARK: Textures

  func createTexture(descriptor: NativeTextureDescriptor) throws -> Promise<NativeTexture> {
    return runAsync {
      let texture = try self.makeTexture(try TextureDescriptorRecord(descriptor))
      return self.textureInfo(texture, id: self.textures.insert(texture, owner: self.owner))
    }
  }

  func loadTextureFromURL(url urlString: String, options: NativeTextureLoadOptions?) throws -> Promise<NativeTexture> {
    let loadOptions = TextureLoadOptionsRecord(options)
    let promise = Promise<NativeTexture>()
    Task.detached(priority: .userInitiated) {
      do {
        guard let url = URL(string: urlString), url.scheme != nil else {
          throw MetalKitError.invalidArgument("Invalid URL '\(urlString)'.")
        }
        let data: Data
        if url.isFileURL {
          data = try Data(contentsOf: url)
        } else {
          let (downloaded, response) = try await URLSession.shared.data(from: url)
          if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw MetalKitError.invalidArgument("Downloading '\(urlString)' failed with HTTP \(http.statusCode).")
          }
          data = downloaded
        }
        let texture = try self.loadTexture(data: data, options: loadOptions)
        promise.resolve(withResult: self.textureInfo(texture, id: self.textures.insert(texture, owner: self.owner)))
      } catch {
        promise.reject(withError: MetalKitError.wrap(error))
      }
    }
    return promise
  }

  func loadTextureFromData(data: ArrayBuffer, options: NativeTextureLoadOptions?) throws -> Promise<NativeTexture> {
    let bytes = data.toData(copyIfNeeded: true)
    let loadOptions = TextureLoadOptionsRecord(options)
    return runAsync {
      guard !bytes.isEmpty else {
        throw MetalKitError.invalidArgument("loadTextureFromData: data is empty.")
      }
      let texture = try self.loadTexture(data: bytes, options: loadOptions)
      return self.textureInfo(texture, id: self.textures.insert(texture, owner: self.owner))
    }
  }

  func updateTexture(
    textureId: String, data: ArrayBuffer, region: NativeTextureRegion?, options: NativeTextureTransferOptions?
  ) throws -> Promise<Void> {
    // Shared textures: one copy, straight from the JavaScript ArrayBuffer into the texture, while
    // the borrowed ArrayBuffer is still valid (no intermediate Data copy and no thread hop).
    if let texture = try? textures.get(textureId), texture.storageMode != .private {
      return settledNow {
        let layout = try self.transferLayout(
          texture, region: try TextureRegionRecord(region), options: try TextureTransferOptionsRecord(options))
        guard data.size >= layout.byteCount else {
          throw MetalKitError.invalidArgument(
            "updateTexture needs \(layout.byteCount) bytes for this region but got \(data.size).")
        }
        let transfer = try TextureTransferOptionsRecord(options)
        texture.replace(
          region: layout.region, mipmapLevel: transfer.mipmapLevel, slice: transfer.slice,
          withBytes: UnsafeRawPointer(data.data), bytesPerRow: layout.bytesPerRow, bytesPerImage: layout.byteCount)
      }
    }
    let bytes = data.toData(copyIfNeeded: true)
    return runAsync {
      let texture = try self.textures.get(textureId)
      try self.uploadTexture(
        texture, data: bytes, region: try TextureRegionRecord(region), options: try TextureTransferOptionsRecord(options))
    }
  }

  func readTexture(
    textureId: String, region: NativeTextureRegion?, options: NativeTextureTransferOptions?
  ) throws -> Promise<ArrayBuffer> {
    return runAsync {
      let texture = try self.textures.get(textureId)
      return try self.readTexture(
        texture, region: try TextureRegionRecord(region), options: try TextureTransferOptionsRecord(options))
    }
  }

  func generateMipmaps(textureId: String) throws -> Promise<Void> {
    return runAsync {
      let texture = try self.textures.get(textureId)
      guard texture.mipmapLevelCount > 1 else {
        throw MetalKitError.invalidArgument("Texture has a single mip level; create it with mipmapLevelCount > 1.")
      }
      try self.runBlit { $0.generateMipmaps(for: texture) }
    }
  }

  func releaseTexture(textureId: String) throws -> Promise<Void> {
    return runAsync {
      self.textures.remove(textureId)
    }
  }

  // MARK: Buffers

  func createBuffer(descriptor: NativeBufferDescriptor) throws -> Promise<NativeBuffer> {
    return runAsync {
      let device = try self.context.requireDevice()
      let length = try intArg(descriptor.length, "length", default: 0)
      guard length > 0 else {
        throw MetalKitError.invalidArgument("Buffer length must be greater than 0.")
      }
      guard length <= device.maxBufferLength else {
        throw MetalKitError.invalidArgument("Buffer length exceeds maxBufferLength (\(device.maxBufferLength)).")
      }
      let options = try MetalParsing.bufferOptions(descriptor.options)
      guard let buffer = device.makeBuffer(length: length, options: options) else {
        throw MetalKitError.gpu("Failed to allocate a \(length)-byte buffer.")
      }
      return self.bufferInfo(buffer, id: self.buffers.insert(buffer, owner: self.owner))
    }
  }

  func createBufferWithData(data: ArrayBuffer, options optionName: String?) throws -> Promise<NativeBuffer> {
    // Shared buffers: `makeBuffer(bytes:)` copies straight from the borrowed JavaScript memory,
    // once, during the call. (Copying into a Data first and allocating later cost a second copy.)
    if let options = try? MetalParsing.bufferOptions(optionName), !options.contains(.storageModePrivate) {
      return settledNow {
        let device = try self.context.requireDevice()
        guard data.size > 0 else {
          throw MetalKitError.invalidArgument("createBufferWithData: data is empty (Metal cannot create zero-length buffers).")
        }
        guard data.size <= device.maxBufferLength else {
          throw MetalKitError.invalidArgument("Buffer length exceeds maxBufferLength (\(device.maxBufferLength)).")
        }
        guard let buffer = device.makeBuffer(bytes: UnsafeRawPointer(data.data), length: data.size, options: options) else {
          throw MetalKitError.gpu("Failed to allocate a \(data.size)-byte buffer.")
        }
        return self.bufferInfo(buffer, id: self.buffers.insert(buffer, owner: self.owner))
      }
    }
    let bytes = data.toData(copyIfNeeded: true)
    return runAsync {
      let device = try self.context.requireDevice()
      let options = try MetalParsing.bufferOptions(optionName)
      guard !bytes.isEmpty else {
        throw MetalKitError.invalidArgument("createBufferWithData: data is empty (Metal cannot create zero-length buffers).")
      }
      let buffer: MTLBuffer
      if options.contains(.storageModePrivate) {
        guard let privateBuffer = device.makeBuffer(length: bytes.count, options: options) else {
          throw MetalKitError.gpu("Failed to allocate a \(bytes.count)-byte buffer.")
        }
        try self.writeBuffer(privateBuffer, data: bytes, offset: 0)
        buffer = privateBuffer
      } else {
        let made = bytes.withUnsafeBytes { raw -> MTLBuffer? in
          guard let base = raw.baseAddress else { return nil }
          return device.makeBuffer(bytes: base, length: raw.count, options: options)
        }
        guard let made else {
          throw MetalKitError.gpu("Failed to allocate a \(bytes.count)-byte buffer.")
        }
        buffer = made
      }
      return self.bufferInfo(buffer, id: self.buffers.insert(buffer, owner: self.owner))
    }
  }

  func updateBuffer(bufferId: String, data: ArrayBuffer, offset: Double?) throws -> Promise<Void> {
    // Shared buffers: a single memcpy from the borrowed JavaScript memory into `contents()`.
    if let buffer = try? buffers.get(bufferId), buffer.storageMode != .private {
      return settledNow {
        try self.writeShared(
          buffer, from: UnsafeRawPointer(data.data), count: data.size, offset: try intArg(offset, "offset", default: 0))
      }
    }
    let bytes = data.toData(copyIfNeeded: true)
    return runAsync {
      let buffer = try self.buffers.get(bufferId)
      try self.writeBuffer(buffer, data: bytes, offset: try intArg(offset, "offset", default: 0))
    }
  }

  func getBufferContents(bufferId: String) throws -> Promise<ArrayBuffer> {
    return runAsync {
      let buffer = try self.buffers.get(bufferId)
      return try self.readBuffer(buffer)
    }
  }

  func mapBuffer(bufferId: String) throws -> ArrayBuffer {
    let buffer = try buffers.get(bufferId)
    guard buffer.storageMode != .private else {
      throw MetalKitError.invalidArgument(
        "mapBuffer: Private buffers have no CPU-visible memory. Create the buffer with 'StorageModeShared'.")
    }
    // The ArrayBuffer aliases the MTLBuffer's memory; the closure keeps the buffer alive until
    // JavaScript garbage-collects the ArrayBuffer, even if the id is released earlier.
    let retained = UncheckedSendable(buffer)
    return ArrayBuffer.wrap(dataWithoutCopy: buffer.contents(), size: buffer.length) {
      withExtendedLifetime(retained) {}
    }
  }

  func releaseBuffer(bufferId: String) throws -> Promise<Void> {
    return runAsync {
      self.buffers.remove(bufferId)
    }
  }

  // MARK: Shaders and pipelines

  func createShaderLibrary(source: String) throws -> Promise<String> {
    return runAsync {
      let device = try self.context.requireDevice()
      do {
        let library = try device.makeLibrary(source: source, options: nil)
        return self.libraries.insert(library, owner: self.owner)
      } catch {
        throw MetalKitError.make("ERR_SHADER_COMPILATION", "Metal shader compilation failed:\n\(error.localizedDescription)")
      }
    }
  }

  func getShaderLibraryFunctionNames(libraryId: String) throws -> Promise<[String]> {
    return runAsync {
      return try self.libraries.get(libraryId).functionNames
    }
  }

  func releaseShaderLibrary(libraryId: String) throws -> Promise<Void> {
    return runAsync {
      self.libraries.remove(libraryId)
    }
  }

  func createComputePipelineState(libraryId: String, functionName: String) throws -> Promise<NativeComputePipelineState> {
    return runAsync {
      let device = try self.context.requireDevice()
      let function = try self.function(named: functionName, in: try self.libraries.get(libraryId))
      guard function.functionType == .kernel else {
        throw MetalKitError.invalidArgument("'\(functionName)' is not a kernel function.")
      }
      let pipeline: MTLComputePipelineState
      do {
        pipeline = try device.makeComputePipelineState(function: function)
      } catch {
        throw MetalKitError.gpu("Failed to create compute pipeline: \(error.localizedDescription)")
      }
      return NativeComputePipelineState(
        id: self.computePipelines.insert(pipeline, owner: self.owner),
        functionName: functionName,
        threadExecutionWidth: Double(pipeline.threadExecutionWidth),
        maxTotalThreadsPerThreadgroup: Double(pipeline.maxTotalThreadsPerThreadgroup))
    }
  }

  func releaseComputePipelineState(pipelineId: String) throws -> Promise<Void> {
    return runAsync {
      self.computePipelines.remove(pipelineId)
    }
  }

  func dispatchCompute(
    pipelineId: String, buffers bufferIds: [String], threadgroups: NativeThreadSize, options: NativeDispatchOptions?
  ) throws -> Promise<NativeComputeDispatchResult> {
    let promise = Promise<NativeComputeDispatchResult>()
    metalWorkQueue.async {
      do {
        try self.dispatchCompute(
          pipelineId: pipelineId, bufferIds: bufferIds, threadgroups: try SizeRecord(threadgroups),
          options: try DispatchOptionsRecord(options), promise: promise)
      } catch {
        promise.reject(withError: MetalKitError.wrap(error))
      }
    }
    return promise
  }

  func dispatchComputeBatch(steps: [NativeComputeStep]) throws -> Promise<NativeComputeBatchResult> {
    let promise = Promise<NativeComputeBatchResult>()
    metalWorkQueue.async {
      do {
        try self.dispatchBatch(try steps.map { try ComputeStepRecord($0) }, promise: promise)
      } catch {
        promise.reject(withError: MetalKitError.wrap(error))
      }
    }
    return promise
  }

  func createRenderPipelineState(descriptor: NativeRenderPipelineDescriptor) throws -> Promise<NativeRenderPipelineState> {
    return runAsync {
      return try self.makeRenderPipeline(try RenderPipelineDescriptorRecord(descriptor))
    }
  }

  func releaseRenderPipelineState(pipelineId: String) throws -> Promise<Void> {
    return runAsync {
      self.renderPipelines.remove(pipelineId)
    }
  }

  // MARK: View control (applies to every mounted MunimMetalkitView)

  func startRendering() throws -> Promise<Void> {
    return runOnMain { MetalViewRegistry.views.forEach { $0.paused = false } }
  }

  func resumeRendering() throws -> Promise<Void> {
    return runOnMain { MetalViewRegistry.views.forEach { $0.paused = false } }
  }

  func stopRendering() throws -> Promise<Void> {
    return runOnMain { MetalViewRegistry.views.forEach { $0.paused = true } }
  }

  func pauseRendering() throws -> Promise<Void> {
    return runOnMain { MetalViewRegistry.views.forEach { $0.paused = true } }
  }

  func setNeedsDisplay() throws -> Promise<Void> {
    return runOnMain { MetalViewRegistry.views.forEach { $0.renderFrame() } }
  }

  func setPreferredFramesPerSecond(fps: Double) throws -> Promise<Void> {
    let value = try intArg(fps, "fps")
    return runOnMain { MetalViewRegistry.views.forEach { $0.preferredFramesPerSecond = value } }
  }

  func setClearColor(red: Double, green: Double, blue: Double, alpha: Double) throws -> Promise<Void> {
    return runOnMain {
      MetalViewRegistry.views.forEach { $0.clearColor = MTLClearColor(red: red, green: green, blue: blue, alpha: alpha) }
    }
  }

  func setDrawableSize(width: Double, height: Double) throws -> Promise<Void> {
    return runOnMain {
      MetalViewRegistry.views.forEach { $0.fixedDrawableSize = CGSize(width: width, height: height) }
    }
  }

  // MARK: Utilities

  func takeScreenshot(options: NativeScreenshotOptions?) throws -> Promise<NativeScreenshot> {
    let result = options?.result ?? "base64"
    let promise = Promise<NativeScreenshot>()
    DispatchQueue.main.async {
      MainActor.assumeIsolated {
        guard let view = MetalViewRegistry.mostRecent else {
          promise.reject(withError: MetalKitError.invalidArgument("No MunimMetalkitView is mounted."))
          return
        }
        view.captureScreenshot(result: result, promise: promise)
      }
    }
    return promise
  }

  func getPerformanceInfo() throws -> Promise<NativePerformanceInfo> {
    return runAsync {
      let device = self.context.device
      return NativePerformanceInfo(
        stats: PerformanceStats.shared.snapshot(),
        deviceName: device?.name,
        recommendedMaxWorkingSetSize: device.map { Double($0.recommendedMaxWorkingSetSize) },
        currentAllocatedSize: device.map { Double($0.currentAllocatedSize) },
        resourceCounts: NativeResourceCounts(
          textures: Double(self.textures.count(owner: self.owner)),
          buffers: Double(self.buffers.count(owner: self.owner)),
          shaderLibraries: Double(self.libraries.count(owner: self.owner)),
          computePipelines: Double(self.computePipelines.count(owner: self.owner)),
          renderPipelines: Double(self.renderPipelines.count(owner: self.owner))))
    }
  }

  // MARK: - Helpers

  private func function(named name: String, in library: MTLLibrary) throws -> MTLFunction {
    guard let function = library.makeFunction(name: name) else {
      throw MetalKitError.invalidArgument(
        "Function '\(name)' not found in library. Available: \(library.functionNames.joined(separator: ", ")).")
    }
    return function
  }

  /// Runs a blit pass synchronously and surfaces GPU errors.
  private func runBlit(_ encode: (MTLBlitCommandEncoder) -> Void) throws {
    let queue = try context.requireQueue()
    guard let commandBuffer = queue.makeCommandBuffer(), let blit = commandBuffer.makeBlitCommandEncoder() else {
      throw MetalKitError.gpu("Failed to create a blit command encoder.")
    }
    encode(blit)
    blit.endEncoding()
    commandBuffer.commit()
    commandBuffer.waitUntilCompleted()
    if commandBuffer.status == .error {
      throw MetalKitError.gpu("Blit failed: \(commandBuffer.error?.localizedDescription ?? "unknown error")")
    }
  }

  private func makeStagingBuffer(length: Int, copying bytes: UnsafeRawPointer? = nil) throws -> MTLBuffer {
    let device = try context.requireDevice()
    let buffer: MTLBuffer? =
      if let bytes {
        device.makeBuffer(bytes: bytes, length: length, options: .storageModeShared)
      } else {
        device.makeBuffer(length: length, options: .storageModeShared)
      }
    guard let buffer else {
      throw MetalKitError.gpu("Failed to allocate a \(length)-byte staging buffer.")
    }
    return buffer
  }

  /// Copies `count` bytes into a new owning ArrayBuffer for JavaScript.
  private func arrayBuffer(copying pointer: UnsafeMutableRawPointer, count: Int) -> ArrayBuffer {
    return ArrayBuffer.copy(of: UnsafePointer(pointer.assumingMemoryBound(to: UInt8.self)), size: count)
  }

  // MARK: Buffers

  private func bufferInfo(_ buffer: MTLBuffer, id: String) -> NativeBuffer {
    return NativeBuffer(
      id: id,
      length: Double(buffer.length),
      storageMode: buffer.storageMode == .private ? "Private" : "Shared")
  }

  private func writeShared(_ buffer: MTLBuffer, from source: UnsafeRawPointer, count: Int, offset: Int) throws {
    guard offset >= 0, offset + count <= buffer.length else {
      throw MetalKitError.invalidArgument(
        "Write of \(count) bytes at offset \(offset) overflows the \(buffer.length)-byte buffer.")
    }
    guard count > 0 else { return }
    buffer.contents().advanced(by: offset).copyMemory(from: source, byteCount: count)
  }

  private func writeBuffer(_ buffer: MTLBuffer, data: Data, offset: Int) throws {
    let count = data.count
    guard offset >= 0, offset + count <= buffer.length else {
      throw MetalKitError.invalidArgument(
        "Write of \(count) bytes at offset \(offset) overflows the \(buffer.length)-byte buffer.")
    }
    guard count > 0 else { return }
    try data.withUnsafeBytes { raw in
      guard let base = raw.baseAddress else { return }
      if buffer.storageMode == .private {
        let staging = try makeStagingBuffer(length: count, copying: base)
        try runBlit { $0.copy(from: staging, sourceOffset: 0, to: buffer, destinationOffset: offset, size: count) }
      } else {
        buffer.contents().advanced(by: offset).copyMemory(from: base, byteCount: count)
      }
    }
  }

  private func readBuffer(_ buffer: MTLBuffer) throws -> ArrayBuffer {
    if buffer.storageMode == .private {
      let staging = try makeStagingBuffer(length: buffer.length)
      try runBlit { $0.copy(from: buffer, sourceOffset: 0, to: staging, destinationOffset: 0, size: buffer.length) }
      return arrayBuffer(copying: staging.contents(), count: buffer.length)
    }
    return arrayBuffer(copying: buffer.contents(), count: buffer.length)
  }

  // MARK: Textures

  private func makeTexture(_ record: TextureDescriptorRecord) throws -> MTLTexture {
    let device = try context.requireDevice()
    guard record.width > 0, record.height > 0, record.depth > 0, record.arrayLength > 0 else {
      throw MetalKitError.invalidArgument("Texture width, height, depth and arrayLength must be greater than 0.")
    }
    let format = try MetalParsing.pixelFormat(record.pixelFormat)
    guard format != .invalid else {
      throw MetalKitError.invalidArgument("pixelFormat must not be 'Invalid'.")
    }
    guard record.sampleCount >= 1, device.supportsTextureSampleCount(record.sampleCount) else {
      throw MetalKitError.unsupported("sampleCount \(record.sampleCount) is not supported by \(device.name).")
    }
    let maxLevels = Int(log2(Double(max(record.width, record.height, record.depth)))) + 1
    guard record.mipmapLevelCount >= 1, record.mipmapLevelCount <= maxLevels else {
      throw MetalKitError.invalidArgument("mipmapLevelCount must be between 1 and \(maxLevels) for this size.")
    }

    let descriptor = MTLTextureDescriptor()
    descriptor.pixelFormat = format
    descriptor.width = record.width
    descriptor.height = record.height
    descriptor.depth = record.depth
    descriptor.arrayLength = record.arrayLength
    descriptor.mipmapLevelCount = record.mipmapLevelCount
    descriptor.sampleCount = record.sampleCount
    if record.depth > 1 {
      descriptor.textureType = .type3D
    } else if record.sampleCount > 1 {
      descriptor.textureType = record.arrayLength > 1 ? .type2DMultisampleArray : .type2DMultisample
    } else {
      descriptor.textureType = record.arrayLength > 1 ? .type2DArray : .type2D
    }
    descriptor.usage = try MetalParsing.textureUsage(record.usage ?? ["ShaderRead"])

    // Depth/stencil and multisample textures cannot be CPU-accessible on Apple GPUs.
    let needsPrivate = MetalParsing.isDepth(format) || record.sampleCount > 1
    if needsPrivate {
      if record.storageMode == "Shared" {
        throw MetalKitError.unsupported("Depth/stencil and multisample textures must use 'Private' storage.")
      }
      _ = try MetalParsing.textureStorageMode(record.storageMode)
      descriptor.storageMode = .private
    } else {
      // Shared by default: Apple-silicon GPUs have unified memory, so the CPU can upload/read directly.
      descriptor.storageMode = try MetalParsing.textureStorageMode(record.storageMode)
    }

    guard let texture = device.makeTexture(descriptor: descriptor) else {
      throw MetalKitError.gpu("Failed to create texture.")
    }
    return texture
  }

  private func loadTexture(data: Data, options: TextureLoadOptionsRecord) throws -> MTLTexture {
    let device = try context.requireDevice()
    let loader = MTKTextureLoader(device: device)
    let storage = try MetalParsing.textureStorageMode(options.storageMode)
    var loaderOptions: [MTKTextureLoader.Option: Any] = [
      .SRGB: NSNumber(value: options.srgb),
      .textureStorageMode: NSNumber(value: storage.rawValue),
      .textureUsage: NSNumber(value: MTLTextureUsage.shaderRead.rawValue),
    ]
    if options.generateMipmaps {
      loaderOptions[.allocateMipmaps] = NSNumber(value: true)
      loaderOptions[.generateMipmaps] = NSNumber(value: true)
    }
    do {
      return try loader.newTexture(data: data, options: loaderOptions)
    } catch {
      throw MetalKitError.invalidArgument("Could not decode image data: \(error.localizedDescription)")
    }
  }

  private func textureInfo(_ texture: MTLTexture, id: String) -> NativeTexture {
    return NativeTexture(
      id: id,
      width: Double(texture.width),
      height: Double(texture.height),
      pixelFormat: MetalParsing.pixelFormatName(texture.pixelFormat),
      mipmapLevelCount: Double(texture.mipmapLevelCount),
      sampleCount: Double(texture.sampleCount),
      arrayLength: Double(texture.arrayLength),
      depth: Double(texture.depth),
      storageMode: texture.storageMode == .private ? "Private" : "Shared")
  }

  /// Validates a 2D transfer and returns the region, tightly packed row pitch and expected byte count.
  private func transferLayout(
    _ texture: MTLTexture, region: TextureRegionRecord, options: TextureTransferOptionsRecord
  ) throws -> (region: MTLRegion, bytesPerRow: Int, byteCount: Int) {
    guard texture.textureType == .type2D || texture.textureType == .type2DArray else {
      throw MetalKitError.unsupported("Only 2D and 2D-array textures can be uploaded or read back.")
    }
    guard let bytesPerPixel = MetalParsing.bytesPerPixel(texture.pixelFormat) else {
      throw MetalKitError.unsupported(
        "Pixel format \(MetalParsing.pixelFormatName(texture.pixelFormat)) cannot be uploaded or read back.")
    }
    let level = options.mipmapLevel
    guard level >= 0, level < texture.mipmapLevelCount, options.slice >= 0, options.slice < texture.arrayLength else {
      throw MetalKitError.invalidArgument("mipmapLevel or slice is out of range.")
    }
    let levelWidth = max(1, texture.width >> level)
    let levelHeight = max(1, texture.height >> level)
    let width = region.width ?? (levelWidth - region.x)
    let height = region.height ?? (levelHeight - region.y)
    guard region.x >= 0, region.y >= 0, width > 0, height > 0,
      region.x + width <= levelWidth, region.y + height <= levelHeight
    else {
      throw MetalKitError.invalidArgument(
        "Region (\(region.x), \(region.y), \(width)x\(height)) is outside the \(levelWidth)x\(levelHeight) mip level.")
    }
    let bytesPerRow = options.bytesPerRow ?? width * bytesPerPixel
    guard bytesPerRow >= width * bytesPerPixel, bytesPerRow % bytesPerPixel == 0 else {
      throw MetalKitError.invalidArgument("bytesPerRow must be >= width * \(bytesPerPixel) and a multiple of \(bytesPerPixel).")
    }
    let mtlRegion = MTLRegion(
      origin: MTLOrigin(x: region.x, y: region.y, z: 0), size: MTLSize(width: width, height: height, depth: 1))
    return (mtlRegion, bytesPerRow, bytesPerRow * height)
  }

  private func uploadTexture(
    _ texture: MTLTexture, data: Data, region: TextureRegionRecord, options: TextureTransferOptionsRecord
  ) throws {
    let layout = try transferLayout(texture, region: region, options: options)
    guard data.count >= layout.byteCount else {
      throw MetalKitError.invalidArgument(
        "updateTexture needs \(layout.byteCount) bytes for this region but got \(data.count).")
    }
    try data.withUnsafeBytes { raw in
      guard let base = raw.baseAddress else {
        throw MetalKitError.invalidArgument("updateTexture: data is empty.")
      }
      if texture.storageMode == .private {
        let staging = try makeStagingBuffer(length: layout.byteCount, copying: base)
        try runBlit {
          $0.copy(
            from: staging, sourceOffset: 0, sourceBytesPerRow: layout.bytesPerRow,
            sourceBytesPerImage: layout.byteCount, sourceSize: layout.region.size,
            to: texture, destinationSlice: options.slice, destinationLevel: options.mipmapLevel,
            destinationOrigin: layout.region.origin)
        }
      } else {
        texture.replace(
          region: layout.region, mipmapLevel: options.mipmapLevel, slice: options.slice,
          withBytes: base, bytesPerRow: layout.bytesPerRow, bytesPerImage: layout.byteCount)
      }
    }
  }

  private func readTexture(
    _ texture: MTLTexture, region: TextureRegionRecord, options: TextureTransferOptionsRecord
  ) throws -> ArrayBuffer {
    let layout = try transferLayout(texture, region: region, options: options)
    if texture.storageMode != .private {
      // Read straight into the ArrayBuffer handed to JavaScript (one copy, no staging buffer).
      let result = ArrayBuffer.allocate(size: layout.byteCount)
      texture.getBytes(
        result.data, bytesPerRow: layout.bytesPerRow, bytesPerImage: layout.byteCount,
        from: layout.region, mipmapLevel: options.mipmapLevel, slice: options.slice)
      return result
    }
    let staging = try makeStagingBuffer(length: layout.byteCount)
    try runBlit {
      $0.copy(
        from: texture, sourceSlice: options.slice, sourceLevel: options.mipmapLevel,
        sourceOrigin: layout.region.origin, sourceSize: layout.region.size,
        to: staging, destinationOffset: 0, destinationBytesPerRow: layout.bytesPerRow,
        destinationBytesPerImage: layout.byteCount)
    }
    return arrayBuffer(copying: staging.contents(), count: layout.byteCount)
  }

  // MARK: Compute

  /// Encodes one dispatch and commits it. The promise settles from the command buffer's completion
  /// handler, so no thread is blocked in `waitUntilCompleted()` while the GPU works.
  private func dispatchCompute(
    pipelineId: String, bufferIds: [String], threadgroups: SizeRecord, options: DispatchOptionsRecord,
    promise: Promise<NativeComputeDispatchResult>
  ) throws {
    let queue = try context.requireQueue()
    let pipeline = try computePipelines.get(pipelineId)
    let boundBuffers = try bufferIds.map { try buffers.get($0) }
    let boundTextures = try (options.textures ?? []).map { try textures.get($0) }

    let groups = threadgroups.mtlSize
    guard groups.width > 0, groups.height > 0, groups.depth > 0 else {
      throw MetalKitError.invalidArgument("threadgroups dimensions must be greater than 0.")
    }
    let perGroup =
      options.threadsPerThreadgroup?.mtlSize
      ?? MTLSize(width: min(pipeline.threadExecutionWidth, pipeline.maxTotalThreadsPerThreadgroup), height: 1, depth: 1)
    try validateThreadgroup(perGroup, pipeline: pipeline)

    guard let commandBuffer = queue.makeCommandBuffer(), let encoder = commandBuffer.makeComputeCommandEncoder() else {
      throw MetalKitError.gpu("Failed to create a compute command encoder.")
    }
    encoder.setComputePipelineState(pipeline)
    for (index, buffer) in boundBuffers.enumerated() {
      encoder.setBuffer(buffer, offset: 0, index: index)
    }
    for (index, texture) in boundTextures.enumerated() {
      encoder.setTexture(texture, index: index)
    }
    encoder.dispatchThreadgroups(groups, threadsPerThreadgroup: perGroup)
    encoder.endEncoding()

    let cpuStart = CACurrentMediaTime()
    commandBuffer.addCompletedHandler { buffer in
      let cpuTime = (CACurrentMediaTime() - cpuStart) * 1000
      if buffer.status == .error {
        promise.reject(
          withError: MetalKitError.gpu("Compute dispatch failed: \(buffer.error?.localizedDescription ?? "unknown error")"))
        return
      }
      let gpuTime = gpuTimeMs(of: buffer)
      if let gpuTime {
        PerformanceStats.shared.recordCompute(gpuTimeMs: gpuTime)
      }
      promise.resolve(
        withResult: NativeComputeDispatchResult(
          gpuTimeMs: gpuTime,
          cpuTimeMs: cpuTime,
          threadgroups: NativeSize(width: Double(groups.width), height: Double(groups.height), depth: Double(groups.depth)),
          threadsPerThreadgroup: NativeSize(
            width: Double(perGroup.width), height: Double(perGroup.height), depth: Double(perGroup.depth))))
    }
    commandBuffer.commit()
  }

  private struct ResolvedComputeStep {
    let pipeline: MTLComputePipelineState
    let buffers: [MTLBuffer]
    let textures: [MTLTexture]
    let step: ComputeStepRecord
    let group: MTLSize
  }

  /// Encodes every step (each `repeatCount` times) into one serial compute encoder in one command
  /// buffer: one commit and one completion for the whole batch instead of a JS round trip per
  /// dispatch. A serial encoder runs dispatches in order, so step N sees step N-1's writes.
  private func dispatchBatch(_ steps: [ComputeStepRecord], promise: Promise<NativeComputeBatchResult>) throws {
    guard !steps.isEmpty else {
      throw MetalKitError.invalidArgument("dispatchComputeBatch needs at least one step.")
    }
    let device = try context.requireDevice()
    let queue = try context.requireQueue()
    // Resolve and validate everything before encoding so a bad id never leaves a half-encoded buffer.
    let resolved = try steps.map { step -> ResolvedComputeStep in
      let pipeline = try computePipelines.get(step.pipelineId)
      let size = (step.threadgroups ?? step.threads ?? SizeRecord()).mtlSize
      guard size.width > 0, size.height > 0, size.depth > 0 else {
        throw MetalKitError.invalidArgument("threadgroups/threads dimensions must be greater than 0.")
      }
      let fallback =
        step.threads != nil
        ? defaultThreadsPerThreadgroup(pipeline, grid: size)
        : MTLSize(width: min(pipeline.threadExecutionWidth, pipeline.maxTotalThreadsPerThreadgroup), height: 1, depth: 1)
      let group = step.threadsPerThreadgroup?.mtlSize ?? fallback
      try validateThreadgroup(group, pipeline: pipeline)
      return ResolvedComputeStep(
        pipeline: pipeline,
        buffers: try step.buffers.map { try buffers.get($0) },
        textures: try step.textures.map { try textures.get($0) },
        step: step,
        group: group)
    }

    guard let commandBuffer = queue.makeCommandBuffer(), let encoder = commandBuffer.makeComputeCommandEncoder() else {
      throw MetalKitError.gpu("Failed to create a compute command encoder.")
    }
    var dispatchCount = 0
    for item in resolved {
      encoder.setComputePipelineState(item.pipeline)
      for (index, buffer) in item.buffers.enumerated() {
        encoder.setBuffer(buffer, offset: 0, index: index)
      }
      for (index, texture) in item.textures.enumerated() {
        encoder.setTexture(texture, index: index)
      }
      for _ in 0..<item.step.repeatCount {
        if let groups = item.step.threadgroups {
          encoder.dispatchThreadgroups(groups.mtlSize, threadsPerThreadgroup: item.group)
        } else if let threads = item.step.threads {
          encodeDispatch(encoder, device: device, grid: threads.mtlSize, threadsPerThreadgroup: item.group)
        }
        dispatchCount += 1
      }
    }
    encoder.endEncoding()

    let count = dispatchCount
    let cpuStart = CACurrentMediaTime()
    commandBuffer.addCompletedHandler { buffer in
      let cpuTime = (CACurrentMediaTime() - cpuStart) * 1000
      if buffer.status == .error {
        promise.reject(
          withError: MetalKitError.gpu("Compute batch failed: \(buffer.error?.localizedDescription ?? "unknown error")"))
        return
      }
      let gpuTime = gpuTimeMs(of: buffer)
      if let gpuTime {
        PerformanceStats.shared.recordCompute(gpuTimeMs: gpuTime)
      }
      promise.resolve(
        withResult: NativeComputeBatchResult(gpuTimeMs: gpuTime, cpuTimeMs: cpuTime, dispatchCount: Double(count)))
    }
    commandBuffer.commit()
  }

  private func validateThreadgroup(_ group: MTLSize, pipeline: MTLComputePipelineState) throws {
    let threadsPerGroup = group.width * group.height * group.depth
    guard group.width > 0, group.height > 0, group.depth > 0,
      threadsPerGroup <= pipeline.maxTotalThreadsPerThreadgroup
    else {
      throw MetalKitError.invalidArgument(
        "threadsPerThreadgroup (\(threadsPerGroup) threads) must be between 1 and \(pipeline.maxTotalThreadsPerThreadgroup).")
    }
  }

  // MARK: Render pipelines

  private func makeRenderPipeline(_ record: RenderPipelineDescriptorRecord) throws -> NativeRenderPipelineState {
    let device = try context.requireDevice()
    guard !record.libraryId.isEmpty, !record.vertexFunction.isEmpty else {
      throw MetalKitError.invalidArgument("createRenderPipelineState requires libraryId and vertexFunction.")
    }
    let library = try libraries.get(record.libraryId)
    let descriptor = MTLRenderPipelineDescriptor()
    let vertex = try function(named: record.vertexFunction, in: library)
    guard vertex.functionType == .vertex else {
      throw MetalKitError.invalidArgument("'\(record.vertexFunction)' is not a vertex function.")
    }
    descriptor.vertexFunction = vertex
    if let fragmentName = record.fragmentFunction {
      let fragment = try function(named: fragmentName, in: library)
      guard fragment.functionType == .fragment else {
        throw MetalKitError.invalidArgument("'\(fragmentName)' is not a fragment function.")
      }
      descriptor.fragmentFunction = fragment
    }

    let attachments = record.colorAttachments ?? [ColorAttachmentRecord()]
    guard attachments.count <= 8 else {
      throw MetalKitError.invalidArgument("At most 8 color attachments are supported.")
    }
    for (index, attachment) in attachments.enumerated() {
      guard let target = descriptor.colorAttachments[index] else { continue }
      target.pixelFormat = try MetalParsing.pixelFormat(attachment.pixelFormat)
      target.isBlendingEnabled = attachment.isBlendingEnabled
      if attachment.isBlendingEnabled {
        target.rgbBlendOperation = try MetalParsing.blendOperation(attachment.rgbBlendOperation)
        target.alphaBlendOperation = try MetalParsing.blendOperation(attachment.alphaBlendOperation)
        target.sourceRGBBlendFactor = try MetalParsing.blendFactor(attachment.sourceRGBBlendFactor, default: .sourceAlpha)
        target.sourceAlphaBlendFactor = try MetalParsing.blendFactor(attachment.sourceAlphaBlendFactor, default: .one)
        target.destinationRGBBlendFactor = try MetalParsing.blendFactor(
          attachment.destinationRGBBlendFactor, default: .oneMinusSourceAlpha)
        target.destinationAlphaBlendFactor = try MetalParsing.blendFactor(
          attachment.destinationAlphaBlendFactor, default: .oneMinusSourceAlpha)
      }
    }
    if let depth = record.depthAttachmentPixelFormat {
      descriptor.depthAttachmentPixelFormat = try MetalParsing.pixelFormat(depth)
    }
    if let stencil = record.stencilAttachmentPixelFormat {
      descriptor.stencilAttachmentPixelFormat = try MetalParsing.pixelFormat(stencil)
    }
    guard device.supportsTextureSampleCount(record.sampleCount) else {
      throw MetalKitError.unsupported("sampleCount \(record.sampleCount) is not supported by \(device.name).")
    }
    descriptor.rasterSampleCount = record.sampleCount
    descriptor.isAlphaToCoverageEnabled = record.alphaToCoverageEnabled
    descriptor.isAlphaToOneEnabled = record.alphaToOneEnabled
    descriptor.isRasterizationEnabled = record.rasterizationEnabled

    let state: MTLRenderPipelineState
    do {
      state = try device.makeRenderPipelineState(descriptor: descriptor)
    } catch {
      throw MetalKitError.gpu("Failed to create render pipeline: \(error.localizedDescription)")
    }
    let entry = RenderPipelineEntry(
      state: state,
      colorPixelFormat: descriptor.colorAttachments[0].pixelFormat,
      depthPixelFormat: descriptor.depthAttachmentPixelFormat,
      stencilPixelFormat: descriptor.stencilAttachmentPixelFormat,
      sampleCount: record.sampleCount)
    return NativeRenderPipelineState(
      id: renderPipelines.insert(entry, owner: owner),
      vertexFunction: record.vertexFunction,
      fragmentFunction: record.fragmentFunction ?? "",
      colorAttachments: attachments.map {
        NativeColorAttachmentInfo(pixelFormat: $0.pixelFormat, isBlendingEnabled: $0.isBlendingEnabled)
      },
      sampleCount: Double(record.sampleCount),
      rasterSampleCount: Double(record.sampleCount),
      alphaToCoverageEnabled: record.alphaToCoverageEnabled,
      alphaToOneEnabled: record.alphaToOneEnabled,
      rasterizationEnabled: record.rasterizationEnabled)
  }
}
