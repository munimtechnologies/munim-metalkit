import ExpoModulesCore
import Foundation
import Metal

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

  func snapshot() -> [String: Any] {
    return lock.withLock {
      let average = frameIntervalsMs.isEmpty ? 0 : frameIntervalsMs.reduce(0, +) / Double(frameIntervalsMs.count)
      return [
        "frameTime": average,
        "fps": average > 0 ? 1000 / average : 0,
        "gpuFrameTime": lastFrameGpuTimeMs as Any,
        "lastComputeGpuTime": lastComputeGpuTimeMs as Any,
        "framesRendered": framesRendered,
        "drawCallCount": lastFrameDrawCalls,
        "triangleCount": lastFrameTriangles,
      ]
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

enum MetalKitError {
  static func make(_ code: String, _ message: String) -> Exception {
    return Exception(name: "MunimMetalkitError", description: message, code: code)
  }

  static func deviceNotAvailable() -> Exception {
    return make("ERR_METAL_UNAVAILABLE", "Metal is not available on this device.")
  }

  static func notFound(kind: String, id: String) -> Exception {
    return make("ERR_NOT_FOUND", "No \(kind) with id '\(id)'. It may have been released.")
  }

  static func invalidArgument(_ message: String) -> Exception {
    return make("ERR_INVALID_ARGUMENT", message)
  }

  static func unsupported(_ message: String) -> Exception {
    return make("ERR_UNSUPPORTED", message)
  }

  static func gpu(_ message: String) -> Exception {
    return make("ERR_GPU", message)
  }

  static func notImplemented(_ name: String) -> Exception {
    return make(
      "ERR_NOT_IMPLEMENTED",
      "munim-metalkit: \(name)() is not implemented. See the \"What works\" table in the README."
    )
  }
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

// MARK: - Records

struct SizeRecord: Record {
  @Field var width: Int = 1
  @Field var height: Int = 1
  @Field var depth: Int = 1

  var mtlSize: MTLSize {
    return MTLSize(width: width, height: height, depth: depth)
  }
}

struct TextureDescriptorRecord: Record {
  @Field var width: Int = 0
  @Field var height: Int = 0
  @Field var pixelFormat: String = "RGBA8Unorm"
  @Field var usage: Either<String, [String]>? = nil
  @Field var mipmapLevelCount: Int = 1
  @Field var sampleCount: Int = 1
  @Field var arrayLength: Int = 1
  @Field var depth: Int = 1
  @Field var storageMode: String? = nil
}

struct TextureRegionRecord: Record {
  @Field var x: Int = 0
  @Field var y: Int = 0
  @Field var width: Int? = nil
  @Field var height: Int? = nil
}

struct TextureTransferOptionsRecord: Record {
  @Field var bytesPerRow: Int? = nil
  @Field var mipmapLevel: Int = 0
  @Field var slice: Int = 0
}

struct TextureLoadOptionsRecord: Record {
  /// Decode as sRGB (`RGBA8Unorm_sRGB`). Defaults to false so texel values match the file bytes.
  @Field var srgb: Bool = false
  @Field var storageMode: String? = nil
  @Field var generateMipmaps: Bool = false
}

struct BufferDescriptorRecord: Record {
  @Field var length: Int = 0
  @Field var options: String? = nil
}

struct ColorAttachmentRecord: Record {
  @Field var pixelFormat: String = "BGRA8Unorm"
  @Field var isBlendingEnabled: Bool = false
  @Field var rgbBlendOperation: String? = nil
  @Field var alphaBlendOperation: String? = nil
  @Field var sourceRGBBlendFactor: String? = nil
  @Field var sourceAlphaBlendFactor: String? = nil
  @Field var destinationRGBBlendFactor: String? = nil
  @Field var destinationAlphaBlendFactor: String? = nil
}

struct RenderPipelineDescriptorRecord: Record {
  @Field var libraryId: String = ""
  @Field var vertexFunction: String = ""
  @Field var fragmentFunction: String? = nil
  @Field var colorAttachments: [ColorAttachmentRecord]? = nil
  @Field var depthAttachmentPixelFormat: String? = nil
  @Field var stencilAttachmentPixelFormat: String? = nil
  @Field var sampleCount: Int = 1
  @Field var alphaToCoverageEnabled: Bool = false
  @Field var alphaToOneEnabled: Bool = false
  @Field var rasterizationEnabled: Bool = true
}

struct DispatchOptionsRecord: Record {
  @Field var threadsPerThreadgroup: SizeRecord? = nil
  @Field var textures: [String]? = nil
}

struct ScreenshotOptionsRecord: Record {
  /// "base64" (default) returns a base64 PNG string, "file" writes a PNG to the caches directory.
  @Field var result: String = "base64"
}

struct ClearColorRecord: Record {
  @Field var red: Double = 0
  @Field var green: Double = 0
  @Field var blue: Double = 0
  @Field var alpha: Double = 1
}

struct DrawableSizeRecord: Record {
  @Field var width: Double = 0
  @Field var height: Double = 0
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
