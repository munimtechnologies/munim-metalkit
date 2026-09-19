import ExpoModulesCore
import ImageIO
import Metal
import MetalKit
import UIKit
import UniformTypeIdentifiers

/// Keeps weak references to mounted views so module-level functions
/// (`takeScreenshot`, `pauseRendering`, ...) can reach them.
@MainActor
enum MetalViewRegistry {
  private final class WeakView {
    weak var view: MunimMetalkitView?
    init(_ view: MunimMetalkitView) {
      self.view = view
    }
  }

  private static var entries: [WeakView] = []

  static func register(_ view: MunimMetalkitView) {
    entries.removeAll { $0.view == nil || $0.view === view }
    entries.append(WeakView(view))
  }

  static var views: [MunimMetalkitView] {
    entries.removeAll { $0.view == nil }
    return entries.compactMap(\.view)
  }

  /// The most recently mounted view that is currently in a window (falls back to any live view).
  static var mostRecent: MunimMetalkitView? {
    let live = views
    return live.last(where: { $0.window != nil }) ?? live.last
  }
}

/// An `MTKView` host that renders the bundled default shader (a rotating RGB triangle).
/// The shader is compiled from source at runtime (see `DefaultShaders.swift`), so the view does
/// not depend on a `.metallib` being present in the app bundle.
public final class MunimMetalkitView: ExpoView {
  let metalView: MTKView
  let onLoad = EventDispatcher()
  let onRender = EventDispatcher()
  let onError = EventDispatcher()

  private let context = MetalContext.shared
  private var pipelineState: MTLRenderPipelineState?
  private var pipelineKey: String?
  private var failedPipelineKey: String?
  private var depthStencilState: MTLDepthStencilState?
  private let startTime = CACurrentMediaTime()
  private var didEmitLoad = false
  private var lastRenderEventTime: CFTimeInterval = 0
  private var pendingCaptures: [(result: String, promise: Promise)] = []

  // MARK: - Props (applied straight to the MTKView)

  var preferredFramesPerSecond: Int = 60 {
    didSet { metalView.preferredFramesPerSecond = preferredFramesPerSecond }
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

  required init(appContext: AppContext? = nil) {
    metalView = MTKView(frame: .zero, device: MetalContext.shared.device)
    super.init(appContext: appContext)

    clipsToBounds = true
    metalView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.depthStencilPixelFormat = .depth32Float
    metalView.sampleCount = 1
    metalView.clearColor = clearColor
    metalView.preferredFramesPerSecond = preferredFramesPerSecond
    metalView.enableSetNeedsDisplay = enableSetNeedsDisplay
    metalView.isPaused = paused
    // Needed so the drawable texture can be blitted out for screenshots.
    metalView.framebufferOnly = false
    metalView.delegate = self
    addSubview(metalView)

    if let device = context.device {
      let depthDescriptor = MTLDepthStencilDescriptor()
      depthDescriptor.depthCompareFunction = .always
      depthDescriptor.isDepthWriteEnabled = false
      depthStencilState = device.makeDepthStencilState(descriptor: depthDescriptor)
    }

    MetalViewRegistry.register(self)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
  }

  // MARK: - Prop setters that can fail

  func setColorPixelFormat(_ name: String) {
    do {
      let format = try MetalParsing.pixelFormat(name)
      guard MetalParsing.bytesPerPixel(format) != nil, !MetalParsing.isDepth(format), format != .r32Float else {
        throw MetalKitError.invalidArgument("colorPixelFormat '\(name)' cannot be used for the view's drawable.")
      }
      metalView.colorPixelFormat = format
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
    } catch {
      emitError(error)
    }
  }

  func setSampleCount(_ count: Int) {
    guard let device = context.device else { return }
    if count >= 1 && device.supportsTextureSampleCount(count) {
      metalView.sampleCount = count
    } else {
      emitError(MetalKitError.unsupported("sampleCount \(count) is not supported by \(device.name)."))
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

  // MARK: - Rendering control

  /// Renders one frame synchronously (works while paused).
  func renderFrame() {
    metalView.draw()
  }

  // MARK: - Screenshots

  /// Renders a frame and reads the drawable back as a PNG. `result` is "base64" or "file".
  func captureScreenshot(result: String, promise: Promise) {
    guard context.device != nil else {
      promise.reject(MetalKitError.deviceNotAvailable())
      return
    }
    guard result == "base64" || result == "file" else {
      promise.reject(MetalKitError.invalidArgument("Screenshot result must be 'base64' or 'file'."))
      return
    }
    pendingCaptures.append((result: result, promise: promise))
    metalView.draw()
  }

  private func failPendingCaptures(_ error: Exception) {
    let captures = pendingCaptures
    pendingCaptures.removeAll()
    for capture in captures {
      capture.promise.reject(error)
    }
  }

  private func emitError(_ error: Error) {
    let message = (error as? Exception)?.reason ?? error.localizedDescription
    let code = (error as? Exception)?.code ?? "ERR_METAL"
    onError(["error": message, "code": code])
  }

  // MARK: - Pipeline

  private func ensurePipeline() -> MTLRenderPipelineState? {
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
}

// MARK: - MTKViewDelegate

extension MunimMetalkitView: @preconcurrency MTKViewDelegate {
  public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  public func draw(in view: MTKView) {
    guard let queue = context.commandQueue, let pipeline = ensurePipeline() else {
      failPendingCaptures(MetalKitError.gpu("The view could not build its render pipeline."))
      return
    }
    guard let passDescriptor = view.currentRenderPassDescriptor, let drawable = view.currentDrawable else {
      failPendingCaptures(
        MetalKitError.gpu("The view has no drawable yet (is it laid out with a non-zero size and on screen?).")
      )
      return
    }
    guard let commandBuffer = queue.makeCommandBuffer(),
      let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: passDescriptor)
    else {
      failPendingCaptures(MetalKitError.gpu("Failed to create a command buffer."))
      return
    }

    let size = view.drawableSize
    let aspect = size.height > 0 ? Float(size.width / size.height) : 1
    var uniforms = SIMD4<Float>(Float(CACurrentMediaTime() - startTime), aspect, 0, 0)

    encoder.label = "munim-metalkit default pass"
    encoder.setRenderPipelineState(pipeline)
    if let depthStencilState {
      encoder.setDepthStencilState(depthStencilState)
    }
    encoder.setVertexBytes(&uniforms, length: MemoryLayout<SIMD4<Float>>.stride, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()

    let capture = encodeCaptureIfNeeded(commandBuffer: commandBuffer, texture: drawable.texture)

    commandBuffer.present(drawable)
    commandBuffer.addCompletedHandler { buffer in
      if let gpuTime = gpuTimeMs(of: buffer) {
        PerformanceStats.shared.recordFrameGpu(gpuTimeMs: gpuTime)
      }
      capture?(buffer)
    }
    commandBuffer.commit()

    PerformanceStats.shared.recordFrameEncoded(drawCalls: 1, triangles: 1)
    emitFrameEvents()
  }

  private func emitFrameEvents() {
    if !didEmitLoad {
      didEmitLoad = true
      onLoad(["deviceName": context.device?.name ?? "unknown"])
    }
    let now = CACurrentMediaTime()
    if now - lastRenderEventTime >= 1 {
      lastRenderEventTime = now
      onRender(PerformanceStats.shared.snapshot())
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

    let reject: (Exception) -> Void = { error in captures.forEach { $0.promise.reject(error) } }
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
        requests.forEach { $0.promise.reject(MetalKitError.gpu("Screenshot frame failed: \(message)")) }
        return
      }
      let data = Data(bytes: box.value.contents(), count: bytesPerRow * height)
      guard let png = encodePNG(data, width: width, height: height, bytesPerRow: bytesPerRow, bitmapInfo: bitmapInfo)
      else {
        requests.forEach { $0.promise.reject(MetalKitError.gpu("PNG encoding failed.")) }
        return
      }
      for request in requests {
        var payload: [String: Any] = ["width": width, "height": height]
        if request.result == "file" {
          let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("munim-metalkit-\(UUID().uuidString).png")
          do {
            try png.write(to: url)
            payload["uri"] = url.absoluteString
          } catch {
            request.promise.reject(MetalKitError.gpu("Failed to write screenshot: \(error.localizedDescription)"))
            continue
          }
        } else {
          payload["base64"] = png.base64EncodedString()
        }
        request.promise.resolve(payload)
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
