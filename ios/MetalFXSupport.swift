import Foundation
import Metal

#if canImport(MetalFX)
import MetalFX
#endif

/// MetalFX feature probes. Every check is guarded at compile time (`canImport`, compiler version)
/// and run time, and answers `false` instead of throwing.
enum MetalFXSupport {
  static func spatial(_ device: MTLDevice) -> Bool {
    #if canImport(MetalFX)
    return MTLFXSpatialScalerDescriptor.supportsDevice(device)
    #else
    return false
    #endif
  }

  static func temporal(_ device: MTLDevice) -> Bool {
    #if canImport(MetalFX)
    return MTLFXTemporalScalerDescriptor.supportsDevice(device)
    #else
    return false
    #endif
  }

  /// MetalFX frame interpolation (iOS/tvOS 26).
  static func frameInterpolation(_ device: MTLDevice) -> Bool {
    #if canImport(MetalFX) && compiler(>=6.2) && !targetEnvironment(simulator)
    if #available(iOS 26, tvOS 26, *) {
      return MTLFXFrameInterpolatorDescriptor.supportsDevice(device)
    }
    return false
    #else
    return false
    #endif
  }
}

/// Upscales a low-resolution render to the drawable with a MetalFX spatial scaler
/// (`MunimMetalkitView`'s `renderScale`). Owned and used by one view on the main thread.
final class SpatialUpscaler {
  let inputWidth: Int
  let inputHeight: Int
  let outputWidth: Int
  let outputHeight: Int
  let pixelFormat: MTLPixelFormat

  #if canImport(MetalFX)
  private let scaler: MTLFXSpatialScaler
  #endif
  /// Used when the drawable's usage does not allow MetalFX to write it directly.
  private var intermediate: MTLTexture?

  /// Returns nil (with the reason) when MetalFX spatial scaling is unavailable for this device,
  /// size or pixel format.
  static func make(
    device: MTLDevice, input: (Int, Int), output: (Int, Int), pixelFormat: MTLPixelFormat
  ) -> Result<SpatialUpscaler, MetalKitException> {
    #if canImport(MetalFX)
    guard MTLFXSpatialScalerDescriptor.supportsDevice(device) else {
      return .failure(
        MetalKitError.unsupported(
          "MetalFX spatial upscaling is not supported on \(device.name); rendering at full resolution."))
    }
    let descriptor = MTLFXSpatialScalerDescriptor()
    descriptor.inputWidth = input.0
    descriptor.inputHeight = input.1
    descriptor.outputWidth = output.0
    descriptor.outputHeight = output.1
    descriptor.colorTextureFormat = pixelFormat
    descriptor.outputTextureFormat = pixelFormat
    descriptor.colorProcessingMode = colorProcessingMode(pixelFormat)
    guard let scaler = descriptor.makeSpatialScaler(device: device) else {
      return .failure(
        MetalKitError.unsupported(
          "MetalFX could not create a spatial scaler for \(MetalParsing.pixelFormatName(pixelFormat)) "
            + "\(input.0)x\(input.1) -> \(output.0)x\(output.1); rendering at full resolution."))
    }
    return .success(
      SpatialUpscaler(scaler: scaler, input: input, output: output, pixelFormat: pixelFormat))
    #else
    return .failure(
      MetalKitError.unsupported("munim-metalkit was built without MetalFX; rendering at full resolution."))
    #endif
  }

  #if canImport(MetalFX)
  private init(scaler: MTLFXSpatialScaler, input: (Int, Int), output: (Int, Int), pixelFormat: MTLPixelFormat) {
    self.scaler = scaler
    self.inputWidth = input.0
    self.inputHeight = input.1
    self.outputWidth = output.0
    self.outputHeight = output.1
    self.pixelFormat = pixelFormat
  }

  /// Gamma-encoded 8/10-bit formats are perceptual, `_sRGB` views decode to linear, float is HDR.
  private static func colorProcessingMode(_ format: MTLPixelFormat) -> MTLFXSpatialScalerColorProcessingMode {
    switch format {
    case .bgra8Unorm_srgb, .rgba8Unorm_srgb: return .linear
    case .rgba16Float: return .hdr
    default: return .perceptual
    }
  }

  /// Usage the low-resolution color texture needs.
  var colorTextureUsage: MTLTextureUsage { scaler.colorTextureUsage }
  #else
  private init() {
    inputWidth = 0
    inputHeight = 0
    outputWidth = 0
    outputHeight = 0
    pixelFormat = .invalid
  }

  var colorTextureUsage: MTLTextureUsage { .shaderRead }
  #endif

  func matches(input: (Int, Int), output: (Int, Int), pixelFormat: MTLPixelFormat) -> Bool {
    return input == (inputWidth, inputHeight) && output == (outputWidth, outputHeight)
      && pixelFormat == self.pixelFormat
  }

  /// Encodes the upscale of `color` into `target` (the drawable texture).
  func encode(commandBuffer: MTLCommandBuffer, color: MTLTexture, target: MTLTexture) throws {
    #if canImport(MetalFX)
    scaler.colorTexture = color
    scaler.inputContentWidth = inputWidth
    scaler.inputContentHeight = inputHeight
    if target.usage.contains(scaler.outputTextureUsage) {
      scaler.outputTexture = target
      scaler.encode(commandBuffer: commandBuffer)
      return
    }
    let output = try intermediateTexture(device: target.device)
    scaler.outputTexture = output
    scaler.encode(commandBuffer: commandBuffer)
    guard let blit = commandBuffer.makeBlitCommandEncoder() else {
      throw MetalKitError.gpu("Failed to create a blit encoder for the upscaled frame.")
    }
    blit.copy(from: output, to: target)
    blit.endEncoding()
    #endif
  }

  #if canImport(MetalFX)
  private func intermediateTexture(device: MTLDevice) throws -> MTLTexture {
    if let intermediate {
      return intermediate
    }
    let descriptor = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: pixelFormat, width: outputWidth, height: outputHeight, mipmapped: false)
    descriptor.usage = scaler.outputTextureUsage
    descriptor.storageMode = .private
    guard let texture = device.makeTexture(descriptor: descriptor) else {
      throw MetalKitError.gpu("Failed to allocate the MetalFX output texture.")
    }
    intermediate = texture
    return texture
  }
  #endif
}
