import Metal
import NitroModules
import UIKit

/// The `MunimMetalkitView` Nitro HybridView. Owns a `MetalHostView` (the MTKView host) and maps
/// props onto it. Props arrive on the main thread; a prop that is removed in JavaScript arrives as
/// `nil` and restores the documented default.
///
/// Event callbacks are applied immediately, while the props that can report errors through
/// `onError` (pixel formats, sample count) are applied in `afterUpdate()`, so an invalid value in
/// the first render still reaches an `onError` passed in the same render.
final class HybridMunimMetalkitView: HybridMunimMetalkitViewSpec, @unchecked Sendable {
  let view: MetalHostView

  private var formatsDirty = false

  override init() {
    view = MainActor.assumeIsolated { MetalHostView() }
    super.init()
  }

  // MARK: Props

  var preferredFramesPerSecond: Double? {
    didSet {
      let fps = Self.int(preferredFramesPerSecond) ?? 60
      onMain { $0.preferredFramesPerSecond = fps }
    }
  }

  var enableSetNeedsDisplay: Bool? {
    didSet {
      let enabled = enableSetNeedsDisplay ?? false
      onMain { $0.enableSetNeedsDisplay = enabled }
    }
  }

  var paused: Bool? {
    didSet {
      let value = paused ?? false
      onMain { $0.paused = value }
    }
  }

  var autoResizeDrawable: Bool? {
    didSet {
      let autoResize = autoResizeDrawable ?? true
      onMain { $0.autoResizeDrawable = autoResize }
    }
  }

  /// `[width, height]`; anything else means "not set".
  var drawableSize: [Double]? {
    didSet {
      var size: CGSize?
      if let values = drawableSize, values.count >= 2 {
        size = CGSize(width: values[0], height: values[1])
      }
      onMain { $0.fixedDrawableSize = size }
    }
  }

  var colorPixelFormat: String? {
    didSet { formatsDirty = true }
  }

  var depthStencilPixelFormat: String? {
    didSet { formatsDirty = true }
  }

  var sampleCount: Double? {
    didSet { formatsDirty = true }
  }

  /// `[red, green, blue, alpha]`; anything else means the default (opaque black).
  var clearColor: [Double]? {
    didSet {
      var color = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1)
      if let values = clearColor, values.count >= 4 {
        color = MTLClearColor(red: values[0], green: values[1], blue: values[2], alpha: values[3])
      }
      onMain { $0.clearColor = color }
    }
  }

  var onLoad: ((_ event: NativeLoadEvent) -> Void)? {
    didSet {
      let callback = onLoad
      onMain { $0.onLoad = callback }
    }
  }

  var onRender: ((_ event: NativeFrameStats) -> Void)? {
    didSet {
      let callback = onRender
      onMain { $0.onRender = callback }
    }
  }

  var onError: ((_ event: NativeErrorEvent) -> Void)? {
    didSet {
      let callback = onError
      onMain { $0.onError = callback }
    }
  }

  func afterUpdate() {
    guard formatsDirty else { return }
    formatsDirty = false
    let color = colorPixelFormat ?? "BGRA8Unorm"
    let depth = depthStencilPixelFormat ?? "Depth32Float"
    let samples = Self.int(sampleCount) ?? 1
    onMain { view in
      view.setColorPixelFormat(color)
      view.setDepthStencilPixelFormat(depth)
      view.setSampleCount(samples)
    }
  }

  // MARK: Methods

  func takeScreenshot(options: NativeScreenshotOptions?) throws -> Promise<NativeScreenshot> {
    let result = options?.result ?? "base64"
    let promise = Promise<NativeScreenshot>()
    let view = self.view
    DispatchQueue.main.async {
      MainActor.assumeIsolated {
        view.captureScreenshot(result: result, promise: promise)
      }
    }
    return promise
  }

  func renderFrame() throws -> Promise<Void> {
    let view = self.view
    return runOnMain { view.renderFrame() }
  }

  // MARK: Helpers

  /// Applies a change to the host view. Props are set on the main thread; anything else hops there.
  private func onMain(_ body: @escaping @MainActor (MetalHostView) -> Void) {
    let view = self.view
    if Thread.isMainThread {
      MainActor.assumeIsolated { body(view) }
    } else {
      DispatchQueue.main.async { body(view) }
    }
  }

  private static func int(_ value: Double?) -> Int? {
    guard let value, value.isFinite, abs(value) < Double(Int32.max) else { return nil }
    return Int(value.rounded())
  }
}
