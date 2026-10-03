import Foundation
import Metal

/// Apple GPU families by raw value. `MTLGPUFamily(rawValue:)` keeps the newest families
/// (Apple10 = 1010, Apple11 = 1011) usable when the module is compiled with an older SDK that has
/// no named case for them; `supportsFamily` simply answers `false` for families the OS predates.
enum GPUFamilies {
  static let apple: [(name: String, generation: Int)] = (4...11).map { ("apple\($0)", $0) }

  static func appleFamily(_ generation: Int) -> MTLGPUFamily? {
    return MTLGPUFamily(rawValue: 1000 + generation)
  }

  static func supportedAppleFamilies(_ device: MTLDevice) -> [String] {
    return apple.compactMap { entry in
      guard let family = appleFamily(entry.generation), device.supportsFamily(family) else { return nil }
      return entry.name
    }
  }

  static func highestAppleFamily(_ device: MTLDevice) -> Int? {
    return apple.reversed().first { entry in
      appleFamily(entry.generation).map { device.supportsFamily($0) } ?? false
    }?.generation
  }
}

/// Feature report for Metal 4 and the related newer APIs. Every probe is guarded both at compile
/// time (`#if compiler(...)`, so consumers on older Xcode still build) and at run time
/// (`#available`), and none of them throws: an unsupported feature is reported as `false` with a
/// reason.
enum MetalCapabilityProbe {
  /// The probes allocate small objects (an MTL4 queue, a compiler, a 4-element tensor), so the
  /// result is computed once per process.
  private static let lock = NSLock()
  nonisolated(unsafe) private static var cached: [String: Any]?

  static func report(device: MTLDevice) -> [String: Any] {
    return lock.withLock {
      if let cached {
        return cached
      }
      let value = probe(device: device)
      cached = value
      return value
    }
  }

  private static func probe(device: MTLDevice) -> [String: Any] {
    let os = ProcessInfo.processInfo.operatingSystemVersion
    var report: [String: Any] = [
      "osVersion": "\(os.majorVersion).\(os.minorVersion)",
      "compiledWithMetal4SDK": compiledWithMetal4SDK,
      "appleGPUFamily": GPUFamilies.highestAppleFamily(device) as Any,
      "metal3": device.supportsFamily(.metal3),
      "metal4": false,
      "mtl4CommandQueue": false,
      "mtl4Compiler": false,
      "tensors": false,
      "residencySets": false,
      "raytracing": device.supportsRaytracing,
    ]
    var reasons: [String] = []

    #if compiler(>=6.2) && !targetEnvironment(simulator)
    if #available(iOS 26, tvOS 26, *) {
      let metal4 = device.supportsFamily(.metal4)
      report["metal4"] = metal4
      if metal4 {
        report["mtl4CommandQueue"] = device.makeMTL4CommandQueue() != nil
        report["mtl4Compiler"] = (try? device.makeCompiler(descriptor: MTL4CompilerDescriptor())) != nil
        report["tensors"] = canCreateTensor(device)
      } else {
        reasons.append("\(device.name) is not in the Metal 4 GPU family (needs Apple A14/M1 or newer).")
      }
    } else {
      reasons.append("Metal 4 needs iOS 26 or newer (running \(os.majorVersion).\(os.minorVersion)).")
    }
    #elseif targetEnvironment(simulator)
    reasons.append("Metal 4 is not available in the Simulator SDK; run on a device.")
    #else
    reasons.append("munim-metalkit was compiled with an SDK older than iOS 26, so Metal 4 probes are compiled out.")
    #endif

    if #available(iOS 18, tvOS 18, *) {
      report["residencySets"] = (try? device.makeResidencySet(descriptor: MTLResidencySetDescriptor())) != nil
    }

    report["unsupportedReason"] = reasons.isEmpty ? nil : reasons.joined(separator: " ")
    return report
  }

  /// True when the Metal 4 probes were compiled in (iOS 26+ device SDK; the Simulator SDK has no
  /// Metal 4 symbols).
  private static var compiledWithMetal4SDK: Bool {
    #if compiler(>=6.2) && !targetEnvironment(simulator)
    return true
    #else
    return false
    #endif
  }

  #if compiler(>=6.2) && !targetEnvironment(simulator)
  /// Creates (and immediately drops) a 4-element float32 tensor. Tensor support depends on the GPU,
  /// so actually allocating one is the only reliable check.
  @available(iOS 26, tvOS 26, *)
  private static func canCreateTensor(_ device: MTLDevice) -> Bool {
    guard let extents = MTLTensorExtents([4]) else { return false }
    let descriptor = MTLTensorDescriptor()
    descriptor.dimensions = extents
    descriptor.dataType = .float32
    descriptor.usage = .compute
    descriptor.storageMode = .shared
    return (try? device.makeTensor(descriptor: descriptor)) != nil
  }
  #endif
}
