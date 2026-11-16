import ImageIO
import Metal
import MetalKit
import NitroModules
import UIKit
import UniformTypeIdentifiers

/// Keeps weak references to mounted views so module-level functions
/// (`takeScreenshot`, `pauseRendering`, ...) can reach them.
@MainActor
enum MetalViewRegistry {
  private final class WeakView {
    weak var view: MetalHostView?
    init(_ view: MetalHostView) {
      self.view = view
    }
  }

  private static var entries: [WeakView] = []

  static func register(_ view: MetalHostView) {
    entries.removeAll { $0.view == nil || $0.view === view }
    entries.append(WeakView(view))
  }

  static var views: [MetalHostView] {
    entries.removeAll { $0.view == nil }
    return entries.compactMap(\.view)
  }

  /// The most recently mounted view that is currently in a window (falls back to any live view).
  static var mostRecent: MetalHostView? {
    let live = views
    return live.last(where: { $0.window != nil }) ?? live.last
  }
}

/// The view's binding props as JavaScript sent them (ids, not yet resolved).
struct ViewBindingSpec {
  var renderPipelineId: String?
  var computePipelineId: String?
  var computeThreads: [Double]?
  var buffers: [String] = []
  var textures: [String] = []
  var uniformBufferId: String?
  var vertexCount: Double?
  var instanceCount: Double?
  var primitiveType: String?
}

/// Resolved Metal objects the view draws with. The view holds strong references, so releasing an
/// id from JavaScript does not pull a resource out from under a frame.
struct ViewBindings {
  var renderPipeline: RenderPipelineEntry?
  var computePipeline: MTLComputePipelineState?
  var computeThreads: MTLSize?
  var buffers: [MTLBuffer] = []
  var textures: [MTLTexture] = []
  var uniformSource: MTLBuffer?
  var vertexCount = 3
  var instanceCount = 1
  var primitive: MTLPrimitiveType = .triangle

  init() {}

  init(_ spec: ViewBindingSpec, store: MetalStore) throws {
    guard spec.buffers.count <= maxViewBuffers else {
      throw MetalKitError.invalidArgument(
        "At most \(maxViewBuffers) buffers can be bound ([[buffer(29)]] and [[buffer(30)]] are reserved).")
    }
    guard spec.textures.count <= maxViewTextures else {
      throw MetalKitError.invalidArgument("At most \(maxViewTextures) textures can be bound.")
    }
    renderPipeline = try spec.renderPipelineId.map { try store.renderPipelines.get($0) }
    computePipeline = try spec.computePipelineId.map { try store.computePipelines.get($0) }
    if let threads = spec.computeThreads, !threads.isEmpty {
      let values = try threads.prefix(3).map { try intArg($0, "computeThreads") }
      let size = MTLSize(
        width: values[0], height: values.count > 1 ? values[1] : 1, depth: values.count > 2 ? values[2] : 1)
      guard size.width > 0, size.height > 0, size.depth > 0 else {
        throw MetalKitError.invalidArgument("computeThreads dimensions must be greater than 0.")
      }
      computeThreads = size
    }
    buffers = try spec.buffers.map { try store.buffers.get($0) }
    textures = try spec.textures.map { try store.textures.get($0) }
    if let id = spec.uniformBufferId {
      let source = try store.buffers.get(id)
      guard source.storageMode != .private else {
        throw MetalKitError.invalidArgument("uniformBufferId must be a Shared buffer (it is read by the CPU every frame).")
      }
      uniformSource = source
    }
    vertexCount = try intArg(spec.vertexCount, "vertexCount", default: 3)
    instanceCount = try intArg(spec.instanceCount, "instanceCount", default: 1)
    guard vertexCount >= 0, instanceCount >= 1 else {
      throw MetalKitError.invalidArgument("vertexCount must be >= 0 and instanceCount >= 1.")
    }
    primitive = try MetalParsing.primitiveType(spec.primitiveType)
  }

  var usesCustomRendering: Bool {
    return renderPipeline != nil
  }

  /// Triangles one draw produces (for frame statistics).
  var triangleCount: Int {
    switch primitive {
    case .triangle: return (vertexCount / 3) * instanceCount
    case .triangleStrip: return max(0, vertexCount - 2) * instanceCount
    default: return 0
    }
  }
}

/// An `MTKView` host. By default it renders the bundled shader (a rotating RGB triangle), which is
/// compiled from source at runtime (see `DefaultShaders.swift`), so the view does not depend on a
/// `.metallib` in the app bundle. With `renderPipelineId` it draws the app's own pipeline instead,
/// optionally after a per-frame compute dispatch (`computePipelineId`), entirely on the native side:
/// the display link drives every frame and JavaScript is not called per frame.
/// `HybridMunimMetalkitView` (the Nitro view) owns it and forwards props and events.
final class MetalHostView: UIView {
  /// Frames the CPU may encode ahead of the GPU. Bounds the per-frame uniform ring below.
  private static let maxFramesInFlight = 3

  let metalView: MTKView
  var onLoad: ((NativeLoadEvent) -> Void)?
  var onRender: ((NativeFrameStats) -> Void)?
  var onError: ((NativeErrorEvent) -> Void)?

  private let context = MetalContext.shared
  private var pipelineState: MTLRenderPipelineState?
  private var pipelineKey: String?
  private var failedPipelineKey: String?
  private var depthStencilState: MTLDepthStencilState?
  private var depthTestState: MTLDepthStencilState?
  private let startTime = CACurrentMediaTime()
  private var lastFrameTime: CFTimeInterval?
  private var frameIndex: UInt32 = 0
  private var didEmitLoad = false
  private var lastRenderEventTime: CFTimeInterval = 0
  private var pendingCaptures: [(result: String, promise: Promise<NativeScreenshot>)] = []

  private let inFlight = DispatchSemaphore(value: MetalHostView.maxFramesInFlight)
  private var bindings = ViewBindings()
  private var bindingsFailed = false
  private var uniformRing: [MTLBuffer] = []
  private var uniformRingIndex = 0
  /// Errors already reported through `onError`, so a per-frame problem is reported once.
  private var reportedErrors = Set<String>()

  private var upscaler: SpatialUpscaler?
  private var failedUpscalerKey: String?
  private var scaledColor: MTLTexture?
  private var scaledDepth: MTLTexture?

  // MARK: - Props (applied straight to the MTKView)

  /// 0 means the screen's maximum refresh rate (120 Hz on ProMotion displays).
  var preferredFramesPerSecond: Int = 60 {
    didSet { applyFramesPerSecond() }
  }

  var enableSetNeedsDisplay: Bool = false {
    didSet { metalView.enableSetNeedsDisplay = enableSetNeedsDisplay }
  }

  var paused: Bool = false {
    didSet { metalView.isPaused = paused }
  }

  var autoResizeDrawable: Bool = true {
    didSet { applyDrawableSize() }
  }

  var fixedDrawableSize: CGSize? {
    didSet { applyDrawableSize() }
  }

  var clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1) {
    didSet { metalView.clearColor = clearColor }
  }

  /// Fraction of the drawable size to render at (0 < scale <= 1). Below 1 the frame is rendered
  /// into a smaller texture and upscaled to the drawable with MetalFX.
  var renderScale: Double = 1 {
    didSet { reportedErrors.removeAll() }
  }

  init() {
    metalView = MTKView(frame: .zero, device: MetalContext.shared.device)
    super.init(frame: .zero)

    clipsToBounds = true
    metalView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.depthStencilPixelFormat = .depth32Float
    metalView.sampleCount = 1
    metalView.clearColor = clearColor
    metalView.preferredFramesPerSecond = preferredFramesPerSecond
    metalView.enableSetNeedsDisplay = enableSetNeedsDisplay
    metalView.isPaused = paused
    // Needed so the drawable texture can be blitted out for screenshots (and written by MetalFX).
    metalView.framebufferOnly = false
    metalView.delegate = self
    addSubview(metalView)

    if let device = context.device {
      let always = MTLDepthStencilDescriptor()
      always.depthCompareFunction = .always
      always.isDepthWriteEnabled = false
      depthStencilState = device.makeDepthStencilState(descriptor: always)
      let less = MTLDepthStencilDescriptor()
      less.depthCompareFunction = .less
      less.isDepthWriteEnabled = true
      depthTestState = device.makeDepthStencilState(descriptor: less)
      // Compile the built-in shader off the main thread so the first frame does not wait for it.
      let box = UncheckedSendable(device)
      DispatchQueue.global(qos: .userInitiated).async {
        _ = try? DefaultShaders.library(device: box.value)
      }
    }

    MetalViewRegistry.register(self)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    applyFramesPerSecond()
  }

  // MARK: - Prop setters that can fail

  func setColorPixelFormat(_ name: String) {
    do {
      let format = try MetalParsing.pixelFormat(name)
      // CAMetalLayer raises an Objective-C exception ("invalid pixel format") for anything outside its
      // supported drawable formats, which would crash the app, so only those are passed through.
      guard MetalParsing.isDrawableFormat(format) else {
        throw MetalKitError.invalidArgument("colorPixelFormat '\(name)' cannot be used for the view's drawable.")
      }
      metalView.colorPixelFormat = format
      reportedErrors.removeAll()
    } catch {
      emitError(error)
    }
  }

  func setDepthStencilPixelFormat(_ name: String) {
    do {
      let format = try MetalParsing.pixelFormat(name)
      guard format == .invalid || MetalParsing.isDepth(format) else {
        throw MetalKitError.invalidArgument("depthStencilPixelFormat '\(name)' is not a depth format.")
      }
      metalView.depthStencilPixelFormat = format
      reportedErrors.removeAll()
    } catch {
      emitError(error)
    }
  }

  func setSampleCount(_ count: Int) {
    guard let device = context.device else { return }
    if count >= 1 && device.supportsTextureSampleCount(count) {
      metalView.sampleCount = count
      reportedErrors.removeAll()
    } else {
      emitError(MetalKitError.unsupported("sampleCount \(count) is not supported by \(device.name)."))
    }
  }

  /// Resolves the binding props. On failure the error is reported through `onError` and the view
  /// only clears (it never falls back to drawing something the app did not ask for).
  func applyBindings(_ spec: ViewBindingSpec) {
    reportedErrors.removeAll()
    do {
      bindings = try ViewBindings(spec, store: MetalStore.shared)
      bindingsFailed = false
    } catch {
      bindings = ViewBindings()
      bindingsFailed = true
      emitError(error)
    }
  }

  private func applyDrawableSize() {
    if let size = fixedDrawableSize, size.width > 0, size.height > 0 {
      metalView.autoResizeDrawable = false
      metalView.drawableSize = size
    } else {
      metalView.autoResizeDrawable = autoResizeDrawable
    }
  }

  private func applyFramesPerSecond() {
    if preferredFramesPerSecond <= 0 {
      metalView.preferredFramesPerSecond = window?.screen.maximumFramesPerSecond ?? 60
    } else {
      metalView.preferredFramesPerSecond = preferredFramesPerSecond
    }
  }

  // MARK: - Rendering control

  /// Renders one frame synchronously (works while paused).
  func renderFrame() {
    metalView.draw()
  }

  // MARK: - Screenshots

  /// Renders a frame and reads the drawable back as a PNG. `result` is "base64" or "file".
  func captureScreenshot(result: String, promise: Promise<NativeScreenshot>) {
    guard context.device != nil else {
      promise.reject(withError: MetalKitError.deviceNotAvailable())
      return
    }
    guard result == "base64" || result == "file" else {
      promise.reject(withError: MetalKitError.invalidArgument("Screenshot result must be 'base64' or 'file'."))
      return
    }
    pendingCaptures.append((result: result, promise: promise))
    metalView.draw()
  }

  private func failPendingCaptures(_ error: MetalKitException) {
    let captures = pendingCaptures
    pendingCaptures.removeAll()
    for capture in captures {
      capture.promise.reject(withError: error)
    }
  }

  private func emitError(_ error: Error) {
    let message = (error as? MetalKitException)?.reason ?? error.localizedDescription
    let code = (error as? MetalKitException)?.code ?? "ERR_METAL"
    onError?(NativeErrorEvent(error: message, code: code))
  }

  /// Reports a per-frame problem once (until the props change), instead of 60 times a second.
  private func emitErrorOnce(_ error: MetalKitException) {
    guard reportedErrors.insert(error.description).inserted else { return }
    emitError(error)
  }

  // MARK: - Pipelines

  private func ensureDefaultPipeline() -> MTLRenderPipelineState? {
    guard let device = context.device else { return nil }
    let key = "\(metalView.colorPixelFormat.rawValue)-\(metalView.depthStencilPixelFormat.rawValue)-\(metalView.sampleCount)"
    if key == pipelineKey, let pipelineState {
      return pipelineState
    }
    if key == failedPipelineKey {
      return nil
    }
    do {
      let library = try DefaultShaders.library(device: device)
      let descriptor = MTLRenderPipelineDescriptor()
      descriptor.label = "munim-metalkit default"
      descriptor.vertexFunction = library.makeFunction(name: DefaultShaders.vertexFunction)
      descriptor.fragmentFunction = library.makeFunction(name: DefaultShaders.fragmentFunction)
      descriptor.colorAttachments[0].pixelFormat = metalView.colorPixelFormat
      descriptor.depthAttachmentPixelFormat = metalView.depthStencilPixelFormat
      if MetalParsing.hasStencil(metalView.depthStencilPixelFormat) {
        descriptor.stencilAttachmentPixelFormat = metalView.depthStencilPixelFormat
      }
      descriptor.rasterSampleCount = metalView.sampleCount
      let state = try device.makeRenderPipelineState(descriptor: descriptor)
      pipelineState = state
      pipelineKey = key
      failedPipelineKey = nil
      return state
    } catch {
      failedPipelineKey = key
      emitError(MetalKitError.gpu("Failed to build the default render pipeline: \(error.localizedDescription)"))
      return nil
    }
  }

  /// Why `pipeline` cannot draw into this view's render target, or nil when it can.
  private func incompatibility(of pipeline: RenderPipelineEntry) -> MetalKitException? {
    let viewColor = metalView.colorPixelFormat
    let viewDepth = metalView.depthStencilPixelFormat
    if pipeline.colorPixelFormat != viewColor {
      return MetalKitError.invalidArgument(
        "The render pipeline's color attachment is \(MetalParsing.pixelFormatName(pipeline.colorPixelFormat)) but the "
          + "view's colorPixelFormat is \(MetalParsing.pixelFormatName(viewColor)).")
    }
    if pipeline.sampleCount != metalView.sampleCount {
      return MetalKitError.invalidArgument(
        "The render pipeline's sampleCount is \(pipeline.sampleCount) but the view's is \(metalView.sampleCount).")
    }
    for (name, format) in [("depth", pipeline.depthPixelFormat), ("stencil", pipeline.stencilPixelFormat)]
    where format != .invalid && format != viewDepth {
      return MetalKitError.invalidArgument(
        "The render pipeline's \(name) format is \(MetalParsing.pixelFormatName(format)) but the view's "
          + "depthStencilPixelFormat is \(MetalParsing.pixelFormatName(viewDepth)).")
    }
    return nil
  }

  // MARK: - Low-resolution rendering (MetalFX)

  /// Prepares the scaled render target for this frame, or returns nil to render at full size.
  private func prepareScaledTarget(device: MTLDevice, drawableWidth: Int, drawableHeight: Int)
    -> (color: MTLTexture, depth: MTLTexture?, upscaler: SpatialUpscaler)?
  {
    guard renderScale < 1 else {
      upscaler = nil
      scaledColor = nil
      scaledDepth = nil
      return nil
    }
    guard renderScale > 0, renderScale.isFinite else {
      emitErrorOnce(MetalKitError.invalidArgument("renderScale must be greater than 0 and at most 1."))
      return nil
    }
    guard metalView.sampleCount == 1 else {
      emitErrorOnce(
        MetalKitError.unsupported("renderScale below 1 cannot be combined with sampleCount > 1; rendering at full resolution."))
      return nil
    }
    let width = max(1, Int((Double(drawableWidth) * renderScale).rounded()))
    let height = max(1, Int((Double(drawableHeight) * renderScale).rounded()))
    let format = metalView.colorPixelFormat
    let output = (drawableWidth, drawableHeight)

    if upscaler?.matches(input: (width, height), output: output, pixelFormat: format) != true {
      // Do not retry a configuration MetalFX already refused on every frame.
      let key = "\(width)x\(height)->\(output.0)x\(output.1)-\(format.rawValue)"
      if key == failedUpscalerKey {
        return nil
      }
      scaledColor = nil
      scaledDepth = nil
      switch SpatialUpscaler.make(device: device, input: (width, height), output: output, pixelFormat: format) {
      case .success(let made):
        upscaler = made
        failedUpscalerKey = nil
      case .failure(let error):
        upscaler = nil
        failedUpscalerKey = key
        emitErrorOnce(error)
        return nil
      }
    }
    guard let upscaler else { return nil }

    if scaledColor == nil {
      let descriptor = MTLTextureDescriptor.texture2DDescriptor(
        pixelFormat: format, width: width, height: height, mipmapped: false)
      descriptor.usage = MTLTextureUsage([.renderTarget, .shaderRead]).union(upscaler.colorTextureUsage)
      descriptor.storageMode = .private
      scaledColor = device.makeTexture(descriptor: descriptor)
    }
    let depthFormat = metalView.depthStencilPixelFormat
    if depthFormat != .invalid && scaledDepth?.pixelFormat != depthFormat {
      let descriptor = MTLTextureDescriptor.texture2DDescriptor(
        pixelFormat: depthFormat, width: width, height: height, mipmapped: false)
      descriptor.usage = .renderTarget
      // Tile memory only: depth is cleared at the start of the pass and never stored.
      descriptor.storageMode = .memoryless
      scaledDepth = device.makeTexture(descriptor: descriptor)
    } else if depthFormat == .invalid {
      scaledDepth = nil
    }
    guard let color = scaledColor else {
      emitErrorOnce(MetalKitError.gpu("Failed to allocate the low-resolution render target."))
      return nil
    }
    return (color, scaledDepth, upscaler)
  }

  // MARK: - Uniforms

  /// Binds `uniformBufferId`'s current contents at `[[buffer(29)]]`. Up to 4 KB is copied into the
  /// command stream (`set*Bytes`); larger data is copied into a ring of `maxFramesInFlight` buffers,
  /// so JavaScript can keep writing the source (e.g. through `mapBuffer`) while earlier frames are
  /// still on the GPU. Either way each frame sees a consistent snapshot.
  private enum UniformSnapshot {
    case none
    case bytes(MTLBuffer)
    case ring(MTLBuffer)
  }

  private func snapshotUniforms(device: MTLDevice) -> UniformSnapshot {
    guard let source = bindings.uniformSource else { return .none }
    if source.length <= 4096 {
      return .bytes(source)
    }
    if uniformRing.count != MetalHostView.maxFramesInFlight || uniformRing.first?.length != source.length {
      uniformRing = (0..<MetalHostView.maxFramesInFlight).compactMap { _ in
        device.makeBuffer(length: source.length, options: [.storageModeShared, .cpuCacheModeWriteCombined])
      }
      uniformRingIndex = 0
    }
    guard uniformRing.count == MetalHostView.maxFramesInFlight else {
      emitErrorOnce(MetalKitError.gpu("Failed to allocate the uniform ring buffers."))
      return .none
    }
    let slot = uniformRing[uniformRingIndex]
    uniformRingIndex = (uniformRingIndex + 1) % MetalHostView.maxFramesInFlight
    slot.contents().copyMemory(from: source.contents(), byteCount: source.length)
    return .ring(slot)
  }

  private func bind(_ encoder: MTLRenderCommandEncoder, uniforms: UniformSnapshot, frame: inout FrameUniforms) {
    for (index, buffer) in bindings.buffers.enumerated() {
      encoder.setVertexBuffer(buffer, offset: 0, index: index)
      encoder.setFragmentBuffer(buffer, offset: 0, index: index)
    }
    for (index, texture) in bindings.textures.enumerated() {
      encoder.setVertexTexture(texture, index: index)
      encoder.setFragmentTexture(texture, index: index)
    }
    switch uniforms {
    case .none:
      break
    case .bytes(let source):
      encoder.setVertexBytes(source.contents(), length: source.length, index: uniformsIndex)
      encoder.setFragmentBytes(source.contents(), length: source.length, index: uniformsIndex)
    case .ring(let buffer):
      encoder.setVertexBuffer(buffer, offset: 0, index: uniformsIndex)
      encoder.setFragmentBuffer(buffer, offset: 0, index: uniformsIndex)
    }
    let length = MemoryLayout<FrameUniforms>.stride
    encoder.setVertexBytes(&frame, length: length, index: frameUniformsIndex)
    encoder.setFragmentBytes(&frame, length: length, index: frameUniformsIndex)
  }

  private func encodeCompute(
    _ commandBuffer: MTLCommandBuffer, device: MTLDevice, pipeline: MTLComputePipelineState,
    renderSize: (Int, Int), uniforms: UniformSnapshot, frame: inout FrameUniforms
  ) {
    guard let encoder = commandBuffer.makeComputeCommandEncoder() else {
      emitErrorOnce(MetalKitError.gpu("Failed to create the view's compute encoder."))
      return
    }
    encoder.label = "munim-metalkit view compute"
    encoder.setComputePipelineState(pipeline)
    for (index, buffer) in bindings.buffers.enumerated() {
      encoder.setBuffer(buffer, offset: 0, index: index)
    }
    for (index, texture) in bindings.textures.enumerated() {
      encoder.setTexture(texture, index: index)
    }
    switch uniforms {
    case .none:
      break
    case .bytes(let source):
      encoder.setBytes(source.contents(), length: source.length, index: uniformsIndex)
    case .ring(let buffer):
      encoder.setBuffer(buffer, offset: 0, index: uniformsIndex)
    }
    encoder.setBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: frameUniformsIndex)
    let grid = bindings.computeThreads ?? MTLSize(width: renderSize.0, height: renderSize.1, depth: 1)
    encodeDispatch(
      encoder, device: device, grid: grid,
      threadsPerThreadgroup: defaultThreadsPerThreadgroup(pipeline, grid: grid))
    encoder.endEncoding()
  }
}

// MARK: - MTKViewDelegate

extension MetalHostView: MTKViewDelegate {
  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  func draw(in view: MTKView) {
    guard let device = context.device, let queue = context.commandQueue else {
      failPendingCaptures(MetalKitError.deviceNotAvailable())
      return
    }
    // Triple buffering: never let the CPU get more than `maxFramesInFlight` frames ahead.
    guard inFlight.wait(timeout: .now() + .milliseconds(500)) == .success else {
      failPendingCaptures(MetalKitError.gpu("The GPU did not finish the previous frames in time."))
      return
    }
    var committed = false
    defer {
      if !committed {
        inFlight.signal()
      }
    }

    // Requesting the pass descriptor makes MTKView acquire the drawable and (re)create its
    // depth / multisample textures at the drawable size.
    guard let viewPass = view.currentRenderPassDescriptor, let drawable = view.currentDrawable else {
      failPendingCaptures(
        MetalKitError.gpu("The view has no drawable yet (is it laid out with a non-zero size and on screen?).")
      )
      return
    }
    guard let commandBuffer = queue.makeCommandBuffer() else {
      failPendingCaptures(MetalKitError.gpu("Failed to create a command buffer."))
      return
    }
    commandBuffer.label = "munim-metalkit frame"
    let target = drawable.texture

    // What to draw: the app's pipeline, the built-in shader, or nothing (clear only) after an error.
    var customPipeline: RenderPipelineEntry?
    var builtInPipeline: MTLRenderPipelineState?
    if let pipeline = bindings.renderPipeline {
      if let problem = incompatibility(of: pipeline) {
        emitErrorOnce(problem)
      } else {
        customPipeline = pipeline
      }
    } else if !bindingsFailed {
      builtInPipeline = ensureDefaultPipeline()
      if builtInPipeline == nil {
        failPendingCaptures(MetalKitError.gpu("The view could not build its render pipeline."))
        return
      }
    }

    // Render target: the drawable, or a smaller texture that MetalFX upscales into it.
    let scaled = prepareScaledTarget(device: device, drawableWidth: target.width, drawableHeight: target.height)
    let renderSize = scaled.map { ($0.color.width, $0.color.height) } ?? (target.width, target.height)

    let now = CACurrentMediaTime()
    var frame = FrameUniforms()
    frame.time = Float(now - startTime)
    frame.deltaTime = lastFrameTime.map { Float(now - $0) } ?? 0
    frame.resolution = SIMD2<Float>(Float(renderSize.0), Float(renderSize.1))
    frame.frameIndex = frameIndex
    frame.renderScale = scaled == nil ? 1 : Float(renderScale)
    lastFrameTime = now

    let uniforms = snapshotUniforms(device: device)
    var drawCalls = 0
    var triangles = 0

    if !bindingsFailed, let compute = bindings.computePipeline {
      encodeCompute(
        commandBuffer, device: device, pipeline: compute, renderSize: renderSize, uniforms: uniforms, frame: &frame)
    }

    // Render pass.
    let pass = MTLRenderPassDescriptor()
    let color = pass.colorAttachments[0]!
    color.loadAction = .clear
    color.clearColor = metalView.clearColor
    if let scaled {
      color.texture = scaled.color
      color.storeAction = .store
    } else {
      color.texture = viewPass.colorAttachments[0].texture
      color.resolveTexture = viewPass.colorAttachments[0].resolveTexture
      color.storeAction = viewPass.colorAttachments[0].storeAction
    }
    let usesDepth: Bool
    let usesStencil: Bool
    if let customPipeline {
      usesDepth = customPipeline.depthPixelFormat != .invalid
      usesStencil = customPipeline.stencilPixelFormat != .invalid
    } else {
      usesDepth = metalView.depthStencilPixelFormat != .invalid
      usesStencil = MetalParsing.hasStencil(metalView.depthStencilPixelFormat)
    }
    let depthTexture = scaled.map { $0.depth } ?? viewPass.depthAttachment.texture
    if usesDepth, let depthTexture {
      pass.depthAttachment.texture = depthTexture
      pass.depthAttachment.loadAction = .clear
      pass.depthAttachment.clearDepth = metalView.clearDepth
      pass.depthAttachment.storeAction = .dontCare
    }
    if usesStencil, let depthTexture {
      pass.stencilAttachment.texture = depthTexture
      pass.stencilAttachment.loadAction = .clear
      pass.stencilAttachment.clearStencil = metalView.clearStencil
      pass.stencilAttachment.storeAction = .dontCare
    }

    guard let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: pass) else {
      failPendingCaptures(MetalKitError.gpu("Failed to create a render command encoder."))
      return
    }
    if let customPipeline {
      encoder.label = "munim-metalkit custom pass"
      encoder.setRenderPipelineState(customPipeline.state)
      if usesDepth, let depthTestState {
        encoder.setDepthStencilState(depthTestState)
      }
      bind(encoder, uniforms: uniforms, frame: &frame)
      if bindings.vertexCount > 0 {
        encoder.drawPrimitives(
          type: bindings.primitive, vertexStart: 0, vertexCount: bindings.vertexCount,
          instanceCount: bindings.instanceCount)
        drawCalls = 1
        triangles = bindings.triangleCount
      }
    } else if let builtInPipeline {
      let aspect = renderSize.1 > 0 ? Float(renderSize.0) / Float(renderSize.1) : 1
      var defaultUniforms = SIMD4<Float>(frame.time, aspect, 0, 0)
      encoder.label = "munim-metalkit default pass"
      encoder.setRenderPipelineState(builtInPipeline)
      if usesDepth, let depthStencilState {
        encoder.setDepthStencilState(depthStencilState)
      }
      encoder.setVertexBytes(&defaultUniforms, length: MemoryLayout<SIMD4<Float>>.stride, index: 0)
      encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
      drawCalls = 1
      triangles = 1
    }
    encoder.endEncoding()

    if let scaled {
      do {
        try scaled.upscaler.encode(commandBuffer: commandBuffer, color: scaled.color, target: target)
      } catch {
        emitErrorOnce(MetalKitError.wrap(error))
      }
    }

    let capture = encodeCaptureIfNeeded(commandBuffer: commandBuffer, texture: target)

    commandBuffer.present(drawable)
    let semaphore = UncheckedSendable(inFlight)
    commandBuffer.addCompletedHandler { buffer in
      if let gpuTime = gpuTimeMs(of: buffer) {
        PerformanceStats.shared.recordFrameGpu(gpuTimeMs: gpuTime)
      }
      capture?(buffer)
      semaphore.value.signal()
    }
    commandBuffer.commit()
    committed = true
    frameIndex &+= 1

    PerformanceStats.shared.recordFrameEncoded(drawCalls: drawCalls, triangles: triangles)
    emitFrameEvents()
  }

  private func emitFrameEvents() {
    if !didEmitLoad {
      didEmitLoad = true
      onLoad?(NativeLoadEvent(deviceName: context.device?.name ?? "unknown"))
    }
    let now = CACurrentMediaTime()
    if now - lastRenderEventTime >= 1 {
      lastRenderEventTime = now
      onRender?(PerformanceStats.shared.snapshot())
    }
  }

  /// Copies the drawable into a CPU-visible buffer inside the frame's command buffer and returns
  /// a completion callback that converts it into a PNG and settles the pending promises.
  private func encodeCaptureIfNeeded(
    commandBuffer: MTLCommandBuffer,
    texture: MTLTexture
  ) -> (@Sendable (MTLCommandBuffer) -> Void)? {
    guard !pendingCaptures.isEmpty else { return nil }
    let captures = pendingCaptures
    pendingCaptures.removeAll()

    let reject: (MetalKitException) -> Void = { error in captures.forEach { $0.promise.reject(withError: error) } }
    let format = texture.pixelFormat
    let bitmapInfo: UInt32
    switch format {
    case .bgra8Unorm, .bgra8Unorm_srgb:
      bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    case .rgba8Unorm, .rgba8Unorm_srgb:
      bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
    default:
      reject(
        MetalKitError.unsupported(
          "Screenshots support 8-bit BGRA/RGBA drawables, not \(MetalParsing.pixelFormatName(format)).")
      )
      return nil
    }

    let width = texture.width
    let height = texture.height
    let bytesPerRow = width * 4
    guard let device = context.device,
      let staging = device.makeBuffer(length: bytesPerRow * height, options: .storageModeShared),
      let blit = commandBuffer.makeBlitCommandEncoder()
    else {
      reject(MetalKitError.gpu("Failed to allocate the screenshot staging buffer."))
      return nil
    }
    blit.copy(
      from: texture, sourceSlice: 0, sourceLevel: 0,
      sourceOrigin: MTLOrigin(x: 0, y: 0, z: 0),
      sourceSize: MTLSize(width: width, height: height, depth: 1),
      to: staging, destinationOffset: 0,
      destinationBytesPerRow: bytesPerRow, destinationBytesPerImage: bytesPerRow * height)
    blit.endEncoding()

    let requests = captures.map { (result: $0.result, promise: $0.promise) }
    let box = UncheckedSendable(staging)
    return { buffer in
      if buffer.status == .error {
        let message = buffer.error?.localizedDescription ?? "unknown error"
        requests.forEach { $0.promise.reject(withError: MetalKitError.gpu("Screenshot frame failed: \(message)")) }
        return
      }
      let data = Data(bytes: box.value.contents(), count: bytesPerRow * height)
      guard let png = encodePNG(data, width: width, height: height, bytesPerRow: bytesPerRow, bitmapInfo: bitmapInfo)
      else {
        requests.forEach { $0.promise.reject(withError: MetalKitError.gpu("PNG encoding failed.")) }
        return
      }
      for request in requests {
        if request.result == "file" {
          let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("munim-metalkit-\(UUID().uuidString).png")
          do {
            try png.write(to: url)
            request.promise.resolve(
              withResult: NativeScreenshot(
                width: Double(width), height: Double(height), base64: nil, uri: url.absoluteString))
          } catch {
            request.promise.reject(
              withError: MetalKitError.gpu("Failed to write screenshot: \(error.localizedDescription)"))
          }
        } else {
          request.promise.resolve(
            withResult: NativeScreenshot(
              width: Double(width), height: Double(height), base64: png.base64EncodedString(), uri: nil))
        }
      }
    }
  }
}

private func encodePNG(_ pixels: Data, width: Int, height: Int, bytesPerRow: Int, bitmapInfo: UInt32) -> Data? {
  guard let provider = CGDataProvider(data: pixels as CFData),
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
    let image = CGImage(
      width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: bytesPerRow,
      space: colorSpace, bitmapInfo: CGBitmapInfo(rawValue: bitmapInfo), provider: provider,
      decode: nil, shouldInterpolate: false, intent: .defaultIntent)
  else {
    return nil
  }
  let output = NSMutableData()
  guard let destination = CGImageDestinationCreateWithData(output, UTType.png.identifier as CFString, 1, nil) else {
    return nil
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    return nil
  }
  return output as Data
}
