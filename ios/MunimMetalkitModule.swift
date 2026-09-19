import ExpoModulesCore
import Metal
import MetalKit

// `@unchecked Sendable`: every stored property is an immutable reference to a lock-protected
// registry or to the thread-safe MTLDevice/MTLCommandQueue holder.
public final class MunimMetalkitModule: Module, @unchecked Sendable {
  private let context = MetalContext.shared
  private let textures = ResourceRegistry<MTLTexture>(kind: "texture")
  private let buffers = ResourceRegistry<MTLBuffer>(kind: "buffer")
  private let libraries = ResourceRegistry<MTLLibrary>(kind: "shader library")
  private let computePipelines = ResourceRegistry<MTLComputePipelineState>(kind: "compute pipeline")
  private let renderPipelines = ResourceRegistry<MTLRenderPipelineState>(kind: "render pipeline")

  public func definition() -> ModuleDefinition {
    Name("MunimMetalkit")

    Constant("PI") {
      Double.pi
    }

    OnDestroy {
      self.releaseAll()
    }

    // MARK: Device

    Function("isMetalAvailable") {
      return self.context.device != nil
    }

    AsyncFunction("getDeviceInfo") { () -> [String: Any] in
      let device = try self.context.requireDevice()
      let threads = device.maxThreadsPerThreadgroup
      let families: [(String, MTLGPUFamily)] = [
        ("apple4", .apple4), ("apple5", .apple5), ("apple6", .apple6),
        ("apple7", .apple7), ("apple8", .apple8), ("apple9", .apple9),
      ]
      return [
        "name": device.name,
        "maxThreadsPerGroup": threads.width,
        "maxThreadsPerThreadgroup": ["width": threads.width, "height": threads.height, "depth": threads.depth],
        "maxThreadgroupMemoryLength": device.maxThreadgroupMemoryLength,
        "maxBufferLength": device.maxBufferLength,
        "recommendedMaxWorkingSetSize": Double(device.recommendedMaxWorkingSetSize),
        "hasUnifiedMemory": device.hasUnifiedMemory,
        "gpuFamilies": families.filter { device.supportsFamily($0.1) }.map(\.0),
      ]
    }

    // MARK: Textures

    AsyncFunction("createTexture") { (descriptor: TextureDescriptorRecord) -> [String: Any] in
      let texture = try self.makeTexture(descriptor)
      return self.textureInfo(texture, id: self.textures.insert(texture))
    }

    AsyncFunction("loadTextureFromURL") { (urlString: String, options: TextureLoadOptionsRecord?) async throws -> [String: Any] in
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
      let texture = try self.loadTexture(data: data, options: options ?? TextureLoadOptionsRecord())
      return self.textureInfo(texture, id: self.textures.insert(texture))
    }

    AsyncFunction("loadTextureFromData") { (data: NativeArrayBuffer, options: TextureLoadOptionsRecord?) -> [String: Any] in
      guard data.byteLength > 0 else {
        throw MetalKitError.invalidArgument("loadTextureFromData: data is empty.")
      }
      let texture = try self.loadTexture(data: Data(data.data), options: options ?? TextureLoadOptionsRecord())
      return self.textureInfo(texture, id: self.textures.insert(texture))
    }

    AsyncFunction("updateTexture") {
      (textureId: String, data: NativeArrayBuffer, region: TextureRegionRecord?, options: TextureTransferOptionsRecord?) in
      let texture = try self.textures.get(textureId)
      try self.uploadTexture(
        texture, data: data, region: region ?? TextureRegionRecord(), options: options ?? TextureTransferOptionsRecord())
    }

    AsyncFunction("readTexture") {
      (textureId: String, region: TextureRegionRecord?, options: TextureTransferOptionsRecord?) -> NativeArrayBuffer in
      let texture = try self.textures.get(textureId)
      return try self.readTexture(
        texture, region: region ?? TextureRegionRecord(), options: options ?? TextureTransferOptionsRecord())
    }

    AsyncFunction("generateMipmaps") { (textureId: String) in
      let texture = try self.textures.get(textureId)
      guard texture.mipmapLevelCount > 1 else {
        throw MetalKitError.invalidArgument("Texture has a single mip level; create it with mipmapLevelCount > 1.")
      }
      try self.runBlit { $0.generateMipmaps(for: texture) }
    }

    AsyncFunction("releaseTexture") { (textureId: String) in
      self.textures.remove(textureId)
    }

    // MARK: Buffers

    AsyncFunction("createBuffer") { (descriptor: BufferDescriptorRecord) -> [String: Any] in
      let device = try self.context.requireDevice()
      guard descriptor.length > 0 else {
        throw MetalKitError.invalidArgument("Buffer length must be greater than 0.")
      }
      guard descriptor.length <= device.maxBufferLength else {
        throw MetalKitError.invalidArgument("Buffer length exceeds maxBufferLength (\(device.maxBufferLength)).")
      }
      let options = try MetalParsing.bufferOptions(descriptor.options)
      guard let buffer = device.makeBuffer(length: descriptor.length, options: options) else {
        throw MetalKitError.gpu("Failed to allocate a \(descriptor.length)-byte buffer.")
      }
      return self.bufferInfo(buffer, id: self.buffers.insert(buffer))
    }

    AsyncFunction("createBufferWithData") { (data: NativeArrayBuffer, optionName: String?) -> [String: Any] in
      let device = try self.context.requireDevice()
      let options = try MetalParsing.bufferOptions(optionName)
      guard data.byteLength > 0 else {
        throw MetalKitError.invalidArgument("createBufferWithData: data is empty (Metal cannot create zero-length buffers).")
      }
      let buffer: MTLBuffer
      if options.contains(.storageModePrivate) {
        guard let privateBuffer = device.makeBuffer(length: data.byteLength, options: options) else {
          throw MetalKitError.gpu("Failed to allocate a \(data.byteLength)-byte buffer.")
        }
        try self.writeBuffer(privateBuffer, data: data, offset: 0)
        buffer = privateBuffer
      } else {
        let made = data.withUnsafeBytes { raw -> MTLBuffer? in
          guard let base = raw.baseAddress else { return nil }
          return device.makeBuffer(bytes: base, length: raw.count, options: options)
        }
        guard let made else {
          throw MetalKitError.gpu("Failed to allocate a \(data.byteLength)-byte buffer.")
        }
        buffer = made
      }
      return self.bufferInfo(buffer, id: self.buffers.insert(buffer))
    }

    AsyncFunction("updateBuffer") { (bufferId: String, data: NativeArrayBuffer, offset: Int?) in
      let buffer = try self.buffers.get(bufferId)
      try self.writeBuffer(buffer, data: data, offset: offset ?? 0)
    }

    AsyncFunction("getBufferContents") { (bufferId: String) -> NativeArrayBuffer in
      let buffer = try self.buffers.get(bufferId)
      return try self.readBuffer(buffer)
    }

    AsyncFunction("releaseBuffer") { (bufferId: String) in
      self.buffers.remove(bufferId)
    }

    // MARK: Shaders and pipelines

    AsyncFunction("createShaderLibrary") { (source: String) -> String in
      let device = try self.context.requireDevice()
      do {
        let library = try device.makeLibrary(source: source, options: nil)
        return self.libraries.insert(library)
      } catch {
        throw MetalKitError.make("ERR_SHADER_COMPILATION", "Metal shader compilation failed:\n\(error.localizedDescription)")
      }
    }

    AsyncFunction("getShaderLibraryFunctionNames") { (libraryId: String) -> [String] in
      return try self.libraries.get(libraryId).functionNames
    }

    AsyncFunction("releaseShaderLibrary") { (libraryId: String) in
      self.libraries.remove(libraryId)
    }

    AsyncFunction("createComputePipelineState") { (libraryId: String, functionName: String) -> [String: Any] in
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
      return [
        "id": self.computePipelines.insert(pipeline),
        "functionName": functionName,
        "threadExecutionWidth": pipeline.threadExecutionWidth,
        "maxTotalThreadsPerThreadgroup": pipeline.maxTotalThreadsPerThreadgroup,
      ]
    }

    AsyncFunction("releaseComputePipelineState") { (pipelineId: String) in
      self.computePipelines.remove(pipelineId)
    }

    AsyncFunction("dispatchCompute") {
      (pipelineId: String, bufferIds: [String], threadgroups: SizeRecord, options: DispatchOptionsRecord?) -> [String: Any] in
      return try self.dispatchCompute(
        pipelineId: pipelineId, bufferIds: bufferIds, threadgroups: threadgroups,
        options: options ?? DispatchOptionsRecord())
    }

    AsyncFunction("createRenderPipelineState") { (descriptor: RenderPipelineDescriptorRecord) -> [String: Any] in
      return try self.makeRenderPipeline(descriptor)
    }

    AsyncFunction("releaseRenderPipelineState") { (pipelineId: String) in
      self.renderPipelines.remove(pipelineId)
    }

    // MARK: View control (applies to every mounted MunimMetalkitView)

    AsyncFunction("startRendering") {
      self.forEachView { $0.paused = false }
    }.runOnQueue(.main)

    AsyncFunction("resumeRendering") {
      self.forEachView { $0.paused = false }
    }.runOnQueue(.main)

    AsyncFunction("stopRendering") {
      self.forEachView { $0.paused = true }
    }.runOnQueue(.main)

    AsyncFunction("pauseRendering") {
      self.forEachView { $0.paused = true }
    }.runOnQueue(.main)

    AsyncFunction("setNeedsDisplay") {
      self.forEachView { $0.renderFrame() }
    }.runOnQueue(.main)

    AsyncFunction("setPreferredFramesPerSecond") { (fps: Int) in
      self.forEachView { $0.preferredFramesPerSecond = fps }
    }.runOnQueue(.main)

    AsyncFunction("setClearColor") { (red: Double, green: Double, blue: Double, alpha: Double) in
      self.forEachView { $0.clearColor = MTLClearColor(red: red, green: green, blue: blue, alpha: alpha) }
    }.runOnQueue(.main)

    AsyncFunction("setDrawableSize") { (width: Double, height: Double) in
      self.forEachView { $0.fixedDrawableSize = CGSize(width: width, height: height) }
    }.runOnQueue(.main)

    // MARK: Utilities

    AsyncFunction("takeScreenshot") { (options: ScreenshotOptionsRecord?, promise: Promise) in
      let result = options?.result ?? "base64"
      MainActor.assumeIsolated {
        guard let view = MetalViewRegistry.mostRecent else {
          promise.reject(MetalKitError.invalidArgument("No MunimMetalkitView is mounted."))
          return
        }
        view.captureScreenshot(result: result, promise: promise)
      }
    }.runOnQueue(.main)

    AsyncFunction("getPerformanceInfo") { () -> [String: Any] in
      var info = PerformanceStats.shared.snapshot()
      if let device = self.context.device {
        info["deviceName"] = device.name
        info["recommendedMaxWorkingSetSize"] = Double(device.recommendedMaxWorkingSetSize)
        info["currentAllocatedSize"] = Double(device.currentAllocatedSize)
      }
      info["resourceCounts"] = [
        "textures": self.textures.count,
        "buffers": self.buffers.count,
        "shaderLibraries": self.libraries.count,
        "computePipelines": self.computePipelines.count,
        "renderPipelines": self.renderPipelines.count,
      ]
      return info
    }

    // MARK: Not implemented (reject loudly instead of pretending to succeed)

    AsyncFunction("createMesh") { (_: [String: Any]?) throws in throw MetalKitError.notImplemented("createMesh") }
    AsyncFunction("loadMeshFromURL") { (_: String?) throws in throw MetalKitError.notImplemented("loadMeshFromURL") }
    AsyncFunction("loadMeshFromData") { (_: NativeArrayBuffer?, _: String?) throws in
      throw MetalKitError.notImplemented("loadMeshFromData")
    }
    AsyncFunction("updateMesh") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("updateMesh") }
    AsyncFunction("releaseMesh") { (_: String?) throws in throw MetalKitError.notImplemented("releaseMesh") }

    AsyncFunction("createAnimation") { (_: [String: Any]?) throws in throw MetalKitError.notImplemented("createAnimation") }
    AsyncFunction("startAnimation") { (_: String?) throws in throw MetalKitError.notImplemented("startAnimation") }
    AsyncFunction("pauseAnimation") { (_: String?) throws in throw MetalKitError.notImplemented("pauseAnimation") }
    AsyncFunction("stopAnimation") { (_: String?) throws in throw MetalKitError.notImplemented("stopAnimation") }
    AsyncFunction("setAnimationTime") { (_: String?, _: Double?) throws in
      throw MetalKitError.notImplemented("setAnimationTime")
    }
    AsyncFunction("releaseAnimation") { (_: String?) throws in throw MetalKitError.notImplemented("releaseAnimation") }

    AsyncFunction("setScene") { (_: [String: Any]?) throws in throw MetalKitError.notImplemented("setScene") }
    AsyncFunction("updateCamera") { (_: [String: Any]?) throws in throw MetalKitError.notImplemented("updateCamera") }
    AsyncFunction("updateLighting") { (_: [String: Any]?) throws in throw MetalKitError.notImplemented("updateLighting") }

    // 2D canvas API: declared in the TypeScript types since 1.x but never had native code.
    AsyncFunction("createCanvas2D") { (_: Double?, _: Double?, _: String?) throws in
      throw MetalKitError.notImplemented("createCanvas2D")
    }
    AsyncFunction("clearCanvas2D") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("clearCanvas2D") }
    AsyncFunction("drawLine2D") { (_: String?, _: [String: Any]?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawLine2D")
    }
    AsyncFunction("drawRectangle2D") { (_: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawRectangle2D")
    }
    AsyncFunction("drawCircle2D") { (_: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawCircle2D")
    }
    AsyncFunction("drawEllipse2D") { (_: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawEllipse2D")
    }
    AsyncFunction("drawPath2D") { (_: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawPath2D")
    }
    AsyncFunction("drawText2D") { (_: String?, _: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawText2D")
    }
    AsyncFunction("measureText2D") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("measureText2D") }
    AsyncFunction("drawImage2D") { (_: String?, _: String?, _: [String: Any]?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("drawImage2D")
    }
    AsyncFunction("compositeCanvas2D") { (_: String?, _: String?, _: String?) throws in
      throw MetalKitError.notImplemented("compositeCanvas2D")
    }
    AsyncFunction("saveCanvas2D") { (_: String?) throws in throw MetalKitError.notImplemented("saveCanvas2D") }
    AsyncFunction("restoreCanvas2D") { (_: String?) throws in throw MetalKitError.notImplemented("restoreCanvas2D") }
    AsyncFunction("translateCanvas2D") { (_: String?, _: Double?, _: Double?) throws in
      throw MetalKitError.notImplemented("translateCanvas2D")
    }
    AsyncFunction("rotateCanvas2D") { (_: String?, _: Double?) throws in throw MetalKitError.notImplemented("rotateCanvas2D") }
    AsyncFunction("scaleCanvas2D") { (_: String?, _: Double?, _: Double?) throws in
      throw MetalKitError.notImplemented("scaleCanvas2D")
    }
    AsyncFunction("setTransformCanvas2D") { (_: String?, _: [Double]?) throws in
      throw MetalKitError.notImplemented("setTransformCanvas2D")
    }
    AsyncFunction("createDrawingLayer") { (_: String?, _: String?) throws in throw MetalKitError.notImplemented("createDrawingLayer") }
    AsyncFunction("deleteDrawingLayer") { (_: String?, _: String?) throws in throw MetalKitError.notImplemented("deleteDrawingLayer") }
    AsyncFunction("setActiveLayer") { (_: String?, _: String?) throws in throw MetalKitError.notImplemented("setActiveLayer") }
    AsyncFunction("setLayerOpacity") { (_: String?, _: String?, _: Double?) throws in
      throw MetalKitError.notImplemented("setLayerOpacity")
    }
    AsyncFunction("setLayerBlendMode") { (_: String?, _: String?, _: String?) throws in
      throw MetalKitError.notImplemented("setLayerBlendMode")
    }
    AsyncFunction("toggleLayerVisibility") { (_: String?, _: String?) throws in
      throw MetalKitError.notImplemented("toggleLayerVisibility")
    }
    AsyncFunction("setBrushStyle") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("setBrushStyle") }
    AsyncFunction("setLineStyle") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("setLineStyle") }
    AsyncFunction("setFillStyle") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("setFillStyle") }
    AsyncFunction("setTextStyle") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("setTextStyle") }
    AsyncFunction("resizeCanvas2D") { (_: String?, _: Double?, _: Double?) throws in
      throw MetalKitError.notImplemented("resizeCanvas2D")
    }
    AsyncFunction("cropCanvas2D") { (_: String?, _: [String: Any]?) throws in throw MetalKitError.notImplemented("cropCanvas2D") }
    AsyncFunction("flipCanvas2D") { (_: String?, _: Bool?, _: Bool?) throws in throw MetalKitError.notImplemented("flipCanvas2D") }
    AsyncFunction("exportCanvas2D") { (_: String?, _: String?) throws in throw MetalKitError.notImplemented("exportCanvas2D") }
    AsyncFunction("importImageToCanvas2D") { (_: String?, _: NativeArrayBuffer?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("importImageToCanvas2D")
    }
    AsyncFunction("getCanvas2DPixel") { (_: String?, _: Double?, _: Double?) throws in
      throw MetalKitError.notImplemented("getCanvas2DPixel")
    }
    AsyncFunction("setCanvas2DPixel") { (_: String?, _: Double?, _: Double?, _: [String: Any]?) throws in
      throw MetalKitError.notImplemented("setCanvas2DPixel")
    }
    AsyncFunction("getCanvas2DData") { (_: String?) throws in throw MetalKitError.notImplemented("getCanvas2DData") }
    AsyncFunction("setCanvas2DData") { (_: String?, _: NativeArrayBuffer?) throws in
      throw MetalKitError.notImplemented("setCanvas2DData")
    }

    // MARK: View

    View(MunimMetalkitView.self) {
      Events("onLoad", "onRender", "onError")

      Prop("preferredFramesPerSecond") { (view: MunimMetalkitView, fps: Int?) in
        view.preferredFramesPerSecond = fps ?? 60
      }

      Prop("enableSetNeedsDisplay") { (view: MunimMetalkitView, enabled: Bool?) in
        view.enableSetNeedsDisplay = enabled ?? false
      }

      Prop("paused") { (view: MunimMetalkitView, paused: Bool?) in
        view.paused = paused ?? false
      }

      Prop("autoResizeDrawable") { (view: MunimMetalkitView, autoResize: Bool?) in
        view.autoResizeDrawable = autoResize ?? true
      }

      Prop("drawableSize") { (view: MunimMetalkitView, size: DrawableSizeRecord?) in
        view.fixedDrawableSize = size.map { CGSize(width: $0.width, height: $0.height) }
      }

      Prop("colorPixelFormat") { (view: MunimMetalkitView, format: String?) in
        view.setColorPixelFormat(format ?? "BGRA8Unorm")
      }

      Prop("depthStencilPixelFormat") { (view: MunimMetalkitView, format: String?) in
        view.setDepthStencilPixelFormat(format ?? "Depth32Float")
      }

      Prop("sampleCount") { (view: MunimMetalkitView, count: Int?) in
        view.setSampleCount(count ?? 1)
      }

      Prop("clearColor") { (view: MunimMetalkitView, color: ClearColorRecord?) in
        let color = color ?? ClearColorRecord()
        view.clearColor = MTLClearColor(red: color.red, green: color.green, blue: color.blue, alpha: color.alpha)
      }

      AsyncFunction("takeScreenshot") { (view: MunimMetalkitView, options: ScreenshotOptionsRecord?, promise: Promise) in
        let result = options?.result ?? "base64"
        MainActor.assumeIsolated {
          view.captureScreenshot(result: result, promise: promise)
        }
      }.runOnQueue(.main)

      AsyncFunction("renderFrame") { (view: MunimMetalkitView) in
        MainActor.assumeIsolated {
          view.renderFrame()
        }
      }.runOnQueue(.main)
    }
  }

  // MARK: - Helpers

  private func releaseAll() {
    textures.removeAll()
    buffers.removeAll()
    libraries.removeAll()
    computePipelines.removeAll()
    renderPipelines.removeAll()
  }

  private func forEachView(_ body: @MainActor (MunimMetalkitView) -> Void) {
    MainActor.assumeIsolated {
      MetalViewRegistry.views.forEach(body)
    }
  }

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

  // MARK: Buffers

  private func bufferInfo(_ buffer: MTLBuffer, id: String) -> [String: Any] {
    return [
      "id": id,
      "length": buffer.length,
      "storageMode": buffer.storageMode == .private ? "Private" : "Shared",
    ]
  }

  private func writeBuffer(_ buffer: MTLBuffer, data: NativeArrayBuffer, offset: Int) throws {
    let count = data.byteLength
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

  private func readBuffer(_ buffer: MTLBuffer) throws -> NativeArrayBuffer {
    if buffer.storageMode == .private {
      let staging = try makeStagingBuffer(length: buffer.length)
      try runBlit { $0.copy(from: buffer, sourceOffset: 0, to: staging, destinationOffset: 0, size: buffer.length) }
      return NativeArrayBuffer.copy(of: staging.contents(), count: buffer.length)
    }
    return NativeArrayBuffer.copy(of: buffer.contents(), count: buffer.length)
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

    let usageNames: [String]
    if let usage = record.usage {
      if let single: String = usage.get() {
        usageNames = [single]
      } else if let list: [String] = usage.get() {
        usageNames = list
      } else {
        usageNames = []
      }
    } else {
      usageNames = ["ShaderRead"]
    }
    descriptor.usage = try MetalParsing.textureUsage(usageNames)

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

  private func textureInfo(_ texture: MTLTexture, id: String) -> [String: Any] {
    return [
      "id": id,
      "width": texture.width,
      "height": texture.height,
      "pixelFormat": MetalParsing.pixelFormatName(texture.pixelFormat),
      "mipmapLevelCount": texture.mipmapLevelCount,
      "sampleCount": texture.sampleCount,
      "arrayLength": texture.arrayLength,
      "depth": texture.depth,
      "storageMode": texture.storageMode == .private ? "Private" : "Shared",
    ]
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
    _ texture: MTLTexture, data: NativeArrayBuffer, region: TextureRegionRecord, options: TextureTransferOptionsRecord
  ) throws {
    let layout = try transferLayout(texture, region: region, options: options)
    guard data.byteLength >= layout.byteCount else {
      throw MetalKitError.invalidArgument(
        "updateTexture needs \(layout.byteCount) bytes for this region but got \(data.byteLength).")
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
  ) throws -> NativeArrayBuffer {
    let layout = try transferLayout(texture, region: region, options: options)
    let staging = try makeStagingBuffer(length: layout.byteCount)
    if texture.storageMode == .private {
      try runBlit {
        $0.copy(
          from: texture, sourceSlice: options.slice, sourceLevel: options.mipmapLevel,
          sourceOrigin: layout.region.origin, sourceSize: layout.region.size,
          to: staging, destinationOffset: 0, destinationBytesPerRow: layout.bytesPerRow,
          destinationBytesPerImage: layout.byteCount)
      }
    } else {
      texture.getBytes(
        staging.contents(), bytesPerRow: layout.bytesPerRow, bytesPerImage: layout.byteCount,
        from: layout.region, mipmapLevel: options.mipmapLevel, slice: options.slice)
    }
    return NativeArrayBuffer.copy(of: staging.contents(), count: layout.byteCount)
  }

  // MARK: Compute

  private func dispatchCompute(
    pipelineId: String, bufferIds: [String], threadgroups: SizeRecord, options: DispatchOptionsRecord
  ) throws -> [String: Any] {
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
    let threadsPerGroup = perGroup.width * perGroup.height * perGroup.depth
    guard threadsPerGroup > 0, threadsPerGroup <= pipeline.maxTotalThreadsPerThreadgroup else {
      throw MetalKitError.invalidArgument(
        "threadsPerThreadgroup (\(threadsPerGroup) threads) must be between 1 and \(pipeline.maxTotalThreadsPerThreadgroup).")
    }

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
    commandBuffer.commit()
    commandBuffer.waitUntilCompleted()
    let cpuTime = (CACurrentMediaTime() - cpuStart) * 1000

    if commandBuffer.status == .error {
      throw MetalKitError.gpu("Compute dispatch failed: \(commandBuffer.error?.localizedDescription ?? "unknown error")")
    }
    let gpuTime = gpuTimeMs(of: commandBuffer)
    if let gpuTime {
      PerformanceStats.shared.recordCompute(gpuTimeMs: gpuTime)
    }
    return [
      "gpuTimeMs": gpuTime as Any,
      "cpuTimeMs": cpuTime,
      "threadgroups": ["width": groups.width, "height": groups.height, "depth": groups.depth],
      "threadsPerThreadgroup": ["width": perGroup.width, "height": perGroup.height, "depth": perGroup.depth],
    ]
  }

  // MARK: Render pipelines

  private func makeRenderPipeline(_ record: RenderPipelineDescriptorRecord) throws -> [String: Any] {
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
    return [
      "id": renderPipelines.insert(state),
      "vertexFunction": record.vertexFunction,
      "fragmentFunction": record.fragmentFunction ?? "",
      "colorAttachments": attachments.map { ["pixelFormat": $0.pixelFormat, "isBlendingEnabled": $0.isBlendingEnabled] },
      "sampleCount": record.sampleCount,
      "rasterSampleCount": record.sampleCount,
      "alphaToCoverageEnabled": record.alphaToCoverageEnabled,
      "alphaToOneEnabled": record.alphaToOneEnabled,
      "rasterizationEnabled": record.rasterizationEnabled,
    ]
  }
}
