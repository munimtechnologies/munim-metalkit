import Foundation
import Metal
import NitroModules
import QuartzCore

// MARK: - Shared device

/// Process-wide Metal device and command queue.
/// `MTLDevice` and `MTLCommandQueue` are documented as thread-safe, so sharing them across
/// the module's async functions and the view's main-thread rendering is safe.
final class MetalContext: @unchecked Sendable {
  static let shared = MetalContext()

  let device: MTLDevice?
  let commandQueue: MTLCommandQueue?

  private init() {
    let device = MTLCreateSystemDefaultDevice()
    self.device = device
    self.commandQueue = device?.makeCommandQueue()
  }

  func requireDevice() throws -> MTLDevice {
    guard let device else {
      throw MetalKitError.deviceNotAvailable()
    }
    return device
  }

  func requireQueue() throws -> MTLCommandQueue {
    guard let commandQueue else {
      throw MetalKitError.deviceNotAvailable()
    }
    return commandQueue
  }
}

// MARK: - Locked registry

/// Thread-safe id -> resource map. Async functions run concurrently on background queues,
/// so every registry access goes through a lock.
final class ResourceRegistry<Value>: @unchecked Sendable {
  private var items: [String: Value] = [:]
  private let lock = NSLock()
  let kind: String

  init(kind: String) {
    self.kind = kind
  }

  func insert(_ value: Value) -> String {
    let id = UUID().uuidString
    lock.withLock { items[id] = value }
    return id
  }

  func get(_ id: String) throws -> Value {
    guard let value = lock.withLock({ items[id] }) else {
      throw MetalKitError.notFound(kind: kind, id: id)
    }
    return value
  }

  @discardableResult
  func remove(_ id: String) -> Bool {
    return lock.withLock { items.removeValue(forKey: id) != nil }
  }

  var count: Int {
    return lock.withLock { items.count }
  }

  func removeAll() {
    lock.withLock { items.removeAll() }
  }
}

// MARK: - Performance stats

/// Real timing data collected from command buffers (`gpuStartTime`/`gpuEndTime`) and from the
/// view's frame callbacks.
final class PerformanceStats: @unchecked Sendable {
  static let shared = PerformanceStats()

  private let lock = NSLock()
  private var lastComputeGpuTimeMs: Double?
  private var lastFrameGpuTimeMs: Double?
  private var frameIntervalsMs: [Double] = []
  private var lastFrameTimestamp: CFTimeInterval?
  private var framesRendered: Int = 0
  private var lastFrameDrawCalls: Int = 0
  private var lastFrameTriangles: Int = 0

  func recordCompute(gpuTimeMs: Double) {
    lock.withLock { lastComputeGpuTimeMs = gpuTimeMs }
  }

  /// Called on the main thread when the view encodes a frame.
  func recordFrameEncoded(drawCalls: Int, triangles: Int) {
    let now = CACurrentMediaTime()
    lock.withLock {
      if let last = lastFrameTimestamp {
        frameIntervalsMs.append((now - last) * 1000)
        if frameIntervalsMs.count > 60 {
          frameIntervalsMs.removeFirst(frameIntervalsMs.count - 60)
        }
      }
      lastFrameTimestamp = now
      framesRendered += 1
      lastFrameDrawCalls = drawCalls
      lastFrameTriangles = triangles
    }
  }

  func recordFrameGpu(gpuTimeMs: Double) {
    lock.withLock { lastFrameGpuTimeMs = gpuTimeMs }
  }

  func snapshot() -> NativeFrameStats {
    return lock.withLock {
      let average = frameIntervalsMs.isEmpty ? 0 : frameIntervalsMs.reduce(0, +) / Double(frameIntervalsMs.count)
      return NativeFrameStats(
        frameTime: average,
        fps: average > 0 ? 1000 / average : 0,
        gpuFrameTime: lastFrameGpuTimeMs,
        lastComputeGpuTime: lastComputeGpuTimeMs,
        framesRendered: Double(framesRendered),
        drawCallCount: Double(lastFrameDrawCalls),
        triangleCount: Double(lastFrameTriangles))
    }
  }
}

/// GPU execution time of a completed command buffer in milliseconds, or nil if unavailable.
func gpuTimeMs(of commandBuffer: MTLCommandBuffer) -> Double? {
  let start = commandBuffer.gpuStartTime
  let end = commandBuffer.gpuEndTime
  guard start > 0, end >= start else {
    return nil
  }
  return (end - start) * 1000
}

// MARK: - Errors

/// An error with a stable code. Nitro passes `description` to JavaScript as the error message;
/// the TypeScript wrapper turns the `[ERR_...]` prefix back into `error.code`.
struct MetalKitException: Error, CustomStringConvertible, LocalizedError {
  let code: String
  let reason: String

  var description: String {
    return "[\(code)] \(reason)"
  }

  var errorDescription: String? {
    return description
  }
}

enum MetalKitError {
  static func make(_ code: String, _ message: String) -> MetalKitException {
    return MetalKitException(code: code, reason: message)
  }

  /// Keeps coded errors as they are and gives any other error (file system, networking, ...) a code.
  static func wrap(_ error: Error) -> MetalKitException {
    if let error = error as? MetalKitException {
      return error
    }
    return make("ERR_UNEXPECTED", error.localizedDescription)
  }

  static func deviceNotAvailable() -> MetalKitException {
    return make("ERR_METAL_UNAVAILABLE", "Metal is not available on this device.")
  }

  static func notFound(kind: String, id: String) -> MetalKitException {
    return make("ERR_NOT_FOUND", "No \(kind) with id '\(id)'. It may have been released.")
  }

  static func invalidArgument(_ message: String) -> MetalKitException {
    return make("ERR_INVALID_ARGUMENT", message)
  }

  static func unsupported(_ message: String) -> MetalKitException {
    return make("ERR_UNSUPPORTED", message)
  }

  static func gpu(_ message: String) -> MetalKitException {
    return make("ERR_GPU", message)
  }
}

// MARK: - Promise helpers

/// Background queue for the module's async work. Metal objects and the registries are
/// thread-safe, so work runs concurrently (as Expo's async functions did).
private let workQueue = DispatchQueue(label: "munim-metalkit.work", qos: .userInitiated, attributes: .concurrent)

/// Runs `body` off the JavaScript thread and settles a Nitro promise with its result.
func runAsync<T>(_ body: @escaping () throws -> T) -> Promise<T> {
  let promise = Promise<T>()
  workQueue.async {
    do {
      promise.resolve(withResult: try body())
    } catch {
      promise.reject(withError: MetalKitError.wrap(error))
    }
  }
  return promise
}

/// Runs `body` on the main thread (views) and settles a Nitro promise with its result.
func runOnMain<T>(_ body: @escaping @MainActor () throws -> T) -> Promise<T> {
  let promise = Promise<T>()
  DispatchQueue.main.async {
    MainActor.assumeIsolated {
      do {
        promise.resolve(withResult: try body())
      } catch {
        promise.reject(withError: MetalKitError.wrap(error))
      }
    }
  }
  return promise
}

// MARK: - Parsing

enum MetalParsing {
  static func pixelFormat(_ name: String) throws -> MTLPixelFormat {
    switch name {
    case "RGBA8Unorm": return .rgba8Unorm
    case "RGBA8Unorm_sRGB": return .rgba8Unorm_srgb
    case "BGRA8Unorm": return .bgra8Unorm
    case "BGRA8Unorm_sRGB": return .bgra8Unorm_srgb
    case "RGB10A2Unorm": return .rgb10a2Unorm
    case "RG11B10Float": return .rg11b10Float
    case "RGB9E5Float": return .rgb9e5Float
    case "RGBA16Float": return .rgba16Float
    case "RGBA32Float": return .rgba32Float
    case "R32Float": return .r32Float
    case "Depth32Float": return .depth32Float
    case "Depth32Float_Stencil8": return .depth32Float_stencil8
    case "Depth24Unorm_Stencil8":
      // Depth24Unorm_Stencil8 exists only on some Macs; it is unavailable on iOS/tvOS.
      throw MetalKitError.unsupported(
        "Depth24Unorm_Stencil8 is not supported on iOS/tvOS. Use Depth32Float_Stencil8 instead."
      )
    case "Invalid": return .invalid
    default:
      throw MetalKitError.invalidArgument("Unknown pixel format '\(name)'.")
    }
  }

  static func pixelFormatName(_ format: MTLPixelFormat) -> String {
    switch format {
    case .rgba8Unorm: return "RGBA8Unorm"
    case .rgba8Unorm_srgb: return "RGBA8Unorm_sRGB"
    case .bgra8Unorm: return "BGRA8Unorm"
    case .bgra8Unorm_srgb: return "BGRA8Unorm_sRGB"
    case .rgb10a2Unorm: return "RGB10A2Unorm"
    case .rg11b10Float: return "RG11B10Float"
    case .rgb9e5Float: return "RGB9E5Float"
    case .rgba16Float: return "RGBA16Float"
    case .rgba32Float: return "RGBA32Float"
    case .r32Float: return "R32Float"
    case .depth32Float: return "Depth32Float"
    case .depth32Float_stencil8: return "Depth32Float_Stencil8"
    case .invalid: return "Invalid"
    default: return "Unknown(\(format.rawValue))"
    }
  }

  /// Bytes per pixel for formats whose texels can be uploaded/read back as tightly packed rows.
  static func bytesPerPixel(_ format: MTLPixelFormat) -> Int? {
    switch format {
    case .rgba8Unorm, .rgba8Unorm_srgb, .bgra8Unorm, .bgra8Unorm_srgb,
      .rgb10a2Unorm, .rg11b10Float, .rgb9e5Float, .r32Float:
      return 4
    case .rgba16Float: return 8
    case .rgba32Float: return 16
    default: return nil
    }
  }

  /// Color formats `CAMetalLayer` accepts for its drawables (and that `pixelFormat(_:)` can parse).
  /// Setting any other format (e.g. RG11B10Float, RGB9E5Float, RGBA32Float) throws `CAMetalLayerInvalid`.
  static func isDrawableFormat(_ format: MTLPixelFormat) -> Bool {
    switch format {
    case .bgra8Unorm, .bgra8Unorm_srgb, .rgba8Unorm, .rgba8Unorm_srgb, .rgb10a2Unorm, .rgba16Float:
      return true
    default:
      return false
    }
  }

  static func hasStencil(_ format: MTLPixelFormat) -> Bool {
    return format == .depth32Float_stencil8 || format == .stencil8
  }

  static func isDepth(_ format: MTLPixelFormat) -> Bool {
    return format == .depth32Float || format == .depth16Unorm || format == .depth32Float_stencil8
  }

  static func textureUsage(_ names: [String]) throws -> MTLTextureUsage {
    var usage: MTLTextureUsage = []
    for name in names {
      switch name {
      case "ShaderRead": usage.insert(.shaderRead)
      case "ShaderWrite": usage.insert(.shaderWrite)
      case "RenderTarget": usage.insert(.renderTarget)
      case "PixelFormatView": usage.insert(.pixelFormatView)
      default: throw MetalKitError.invalidArgument("Unknown texture usage '\(name)'.")
      }
    }
    return usage.isEmpty ? .shaderRead : usage
  }

  static func textureStorageMode(_ name: String?) throws -> MTLStorageMode {
    switch name {
    case nil, "Shared": return .shared
    case "Private": return .private
    case "Managed":
      throw MetalKitError.unsupported("Managed storage is macOS-only. Use 'Shared' (the default) or 'Private'.")
    case let other?:
      throw MetalKitError.invalidArgument("Unknown storage mode '\(other)'.")
    }
  }

  static func bufferOptions(_ name: String?) throws -> MTLResourceOptions {
    switch name {
    case nil, "StorageModeShared", "CPUCacheModeDefaultCache": return .storageModeShared
    case "CPUCacheModeWriteCombined": return [.storageModeShared, .cpuCacheModeWriteCombined]
    case "StorageModePrivate": return .storageModePrivate
    case "StorageModeManaged":
      throw MetalKitError.unsupported(
        "StorageModeManaged is macOS-only. Use 'StorageModeShared' (the default) or 'StorageModePrivate'."
      )
    case let other?:
      throw MetalKitError.invalidArgument("Unknown buffer option '\(other)'.")
    }
  }

  static func blendFactor(_ name: String?, default fallback: MTLBlendFactor) throws -> MTLBlendFactor {
    switch name {
    case nil: return fallback
    case "Zero": return .zero
    case "One": return .one
    case "SourceColor": return .sourceColor
    case "OneMinusSourceColor": return .oneMinusSourceColor
    case "SourceAlpha": return .sourceAlpha
    case "OneMinusSourceAlpha": return .oneMinusSourceAlpha
    case "DestinationColor": return .destinationColor
    case "OneMinusDestinationColor": return .oneMinusDestinationColor
    case "DestinationAlpha": return .destinationAlpha
    case "OneMinusDestinationAlpha": return .oneMinusDestinationAlpha
    case "BlendColor": return .blendColor
    case "OneMinusBlendColor": return .oneMinusBlendColor
    case "BlendAlpha": return .blendAlpha
    case "OneMinusBlendAlpha": return .oneMinusBlendAlpha
    case "SourceAlphaSaturated": return .sourceAlphaSaturated
    case "Source1Color": return .source1Color
    case "OneMinusSource1Color": return .oneMinusSource1Color
    case "Source1Alpha": return .source1Alpha
    case "OneMinusSource1Alpha": return .oneMinusSource1Alpha
    case let other?: throw MetalKitError.invalidArgument("Unknown blend factor '\(other)'.")
    }
  }

  static func blendOperation(_ name: String?) throws -> MTLBlendOperation {
    switch name {
    case nil, "Add": return .add
    case "Subtract": return .subtract
    case "ReverseSubtract": return .reverseSubtract
    case "Min": return .min
    case "Max": return .max
    case let other?: throw MetalKitError.invalidArgument("Unknown blend operation '\(other)'.")
    }
  }
}

// MARK: - Arguments

/// Converts a JavaScript number to an `Int`, rejecting non-integers instead of trapping.
func intArg(_ value: Double?, _ name: String, default fallback: Int) throws -> Int {
  guard let value else { return fallback }
  return try intArg(value, name)
}

func intArg(_ value: Double, _ name: String) throws -> Int {
  guard value.isFinite, value.rounded() == value, abs(value) <= 9_007_199_254_740_991 else {
    throw MetalKitError.invalidArgument("\(name) must be an integer, got \(value).")
  }
  return Int(value)
}

func optionalIntArg(_ value: Double?, _ name: String) throws -> Int? {
  guard let value else { return nil }
  return try intArg(value, name)
}

// MARK: - Records (native structs with the documented defaults applied)

struct SizeRecord {
  var width = 1
  var height = 1
  var depth = 1

  init() {}

  init(_ size: NativeThreadSize) throws {
    width = try intArg(size.width, "width", default: 1)
    height = try intArg(size.height, "height", default: 1)
    depth = try intArg(size.depth, "depth", default: 1)
  }

  var mtlSize: MTLSize {
    return MTLSize(width: width, height: height, depth: depth)
  }
}

struct TextureDescriptorRecord {
  var width = 0
  var height = 0
  var pixelFormat = "RGBA8Unorm"
  var usage: [String]? = nil
  var mipmapLevelCount = 1
  var sampleCount = 1
  var arrayLength = 1
  var depth = 1
  var storageMode: String? = nil

  init(_ descriptor: NativeTextureDescriptor) throws {
    width = try intArg(descriptor.width, "width", default: 0)
    height = try intArg(descriptor.height, "height", default: 0)
    pixelFormat = descriptor.pixelFormat ?? "RGBA8Unorm"
    usage = descriptor.usage
    mipmapLevelCount = try intArg(descriptor.mipmapLevelCount, "mipmapLevelCount", default: 1)
    sampleCount = try intArg(descriptor.sampleCount, "sampleCount", default: 1)
    arrayLength = try intArg(descriptor.arrayLength, "arrayLength", default: 1)
    depth = try intArg(descriptor.depth, "depth", default: 1)
    storageMode = descriptor.storageMode
  }
}

struct TextureRegionRecord {
  var x = 0
  var y = 0
  var width: Int? = nil
  var height: Int? = nil

  init() {}

  init(_ region: NativeTextureRegion?) throws {
    guard let region else { return }
    x = try intArg(region.x, "x", default: 0)
    y = try intArg(region.y, "y", default: 0)
    width = try optionalIntArg(region.width, "width")
    height = try optionalIntArg(region.height, "height")
  }
}

struct TextureTransferOptionsRecord {
  var bytesPerRow: Int? = nil
  var mipmapLevel = 0
  var slice = 0

  init() {}

  init(_ options: NativeTextureTransferOptions?) throws {
    guard let options else { return }
    bytesPerRow = try optionalIntArg(options.bytesPerRow, "bytesPerRow")
    mipmapLevel = try intArg(options.mipmapLevel, "mipmapLevel", default: 0)
    slice = try intArg(options.slice, "slice", default: 0)
  }
}

struct TextureLoadOptionsRecord {
  /// Decode as sRGB (`RGBA8Unorm_sRGB`). Defaults to false so texel values match the file bytes.
  var srgb = false
  var storageMode: String? = nil
  var generateMipmaps = false

  init(_ options: NativeTextureLoadOptions?) {
    guard let options else { return }
    srgb = options.srgb ?? false
    storageMode = options.storageMode
    generateMipmaps = options.generateMipmaps ?? false
  }
}

struct ColorAttachmentRecord {
  var pixelFormat = "BGRA8Unorm"
  var isBlendingEnabled = false
  var rgbBlendOperation: String? = nil
  var alphaBlendOperation: String? = nil
  var sourceRGBBlendFactor: String? = nil
  var sourceAlphaBlendFactor: String? = nil
  var destinationRGBBlendFactor: String? = nil
  var destinationAlphaBlendFactor: String? = nil

  init() {}

  init(_ attachment: NativeColorAttachment) {
    pixelFormat = attachment.pixelFormat ?? "BGRA8Unorm"
    isBlendingEnabled = attachment.isBlendingEnabled ?? false
    rgbBlendOperation = attachment.rgbBlendOperation
    alphaBlendOperation = attachment.alphaBlendOperation
    sourceRGBBlendFactor = attachment.sourceRGBBlendFactor
    sourceAlphaBlendFactor = attachment.sourceAlphaBlendFactor
    destinationRGBBlendFactor = attachment.destinationRGBBlendFactor
    destinationAlphaBlendFactor = attachment.destinationAlphaBlendFactor
  }
}

struct RenderPipelineDescriptorRecord {
  var libraryId = ""
  var vertexFunction = ""
  var fragmentFunction: String? = nil
  var colorAttachments: [ColorAttachmentRecord]? = nil
  var depthAttachmentPixelFormat: String? = nil
  var stencilAttachmentPixelFormat: String? = nil
  var sampleCount = 1
  var alphaToCoverageEnabled = false
  var alphaToOneEnabled = false
  var rasterizationEnabled = true

  init(_ descriptor: NativeRenderPipelineDescriptor) throws {
    libraryId = descriptor.libraryId ?? ""
    vertexFunction = descriptor.vertexFunction ?? ""
    fragmentFunction = descriptor.fragmentFunction
    colorAttachments = descriptor.colorAttachments?.map { ColorAttachmentRecord($0) }
    depthAttachmentPixelFormat = descriptor.depthAttachmentPixelFormat
    stencilAttachmentPixelFormat = descriptor.stencilAttachmentPixelFormat
    sampleCount = try intArg(descriptor.sampleCount, "sampleCount", default: 1)
    alphaToCoverageEnabled = descriptor.alphaToCoverageEnabled ?? false
    alphaToOneEnabled = descriptor.alphaToOneEnabled ?? false
    rasterizationEnabled = descriptor.rasterizationEnabled ?? true
  }
}

struct DispatchOptionsRecord {
  var threadsPerThreadgroup: SizeRecord? = nil
  var textures: [String]? = nil

  init(_ options: NativeDispatchOptions?) throws {
    guard let options else { return }
    threadsPerThreadgroup = try options.threadsPerThreadgroup.map { try SizeRecord($0) }
    textures = options.textures
  }
}

// MARK: - Sendable helpers

/// Wraps non-Sendable Metal objects that are handed across threads in completion handlers.
/// Metal resources are safe to use from any thread; they simply are not annotated as Sendable.
struct UncheckedSendable<T>: @unchecked Sendable {
  let value: T
  init(_ value: T) {
    self.value = value
  }
}
