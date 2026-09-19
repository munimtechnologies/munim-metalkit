import Foundation
import Metal

/// The view's built-in shader. It is compiled from source at runtime instead of relying on
/// `makeDefaultLibrary()`, which fails unless the host app happens to ship a `.metallib`.
enum DefaultShaders {
  static let vertexFunction = "munim_metalkit_default_vertex"
  static let fragmentFunction = "munim_metalkit_default_fragment"

  static let source = """
    #include <metal_stdlib>
    using namespace metal;

    struct MunimVertexOut {
      float4 position [[position]];
      float4 color;
    };

    // x = seconds since the view was created, y = drawable aspect ratio (width / height)
    struct MunimUniforms {
      float4 values;
    };

    vertex MunimVertexOut munim_metalkit_default_vertex(uint vid [[vertex_id]],
                                                        constant MunimUniforms &u [[buffer(0)]]) {
      const float2 positions[3] = { float2(0.0, 0.8), float2(-0.7, -0.45), float2(0.7, -0.45) };
      const float4 colors[3] = { float4(1.0, 0.25, 0.25, 1.0),
                                 float4(0.25, 1.0, 0.35, 1.0),
                                 float4(0.25, 0.45, 1.0, 1.0) };
      float angle = u.values.x * 0.8;
      float2 p = positions[vid];
      float2 r = float2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
      float aspect = max(u.values.y, 0.001);
      if (aspect > 1.0) {
        r.x /= aspect;
      } else {
        r.y *= aspect;
      }
      MunimVertexOut out;
      out.position = float4(r, 0.0, 1.0);
      out.color = colors[vid];
      return out;
    }

    fragment float4 munim_metalkit_default_fragment(MunimVertexOut in [[stage_in]]) {
      return in.color;
    }
    """

  private static let lock = NSLock()
  nonisolated(unsafe) private static var cached: MTLLibrary?

  static func library(device: MTLDevice) throws -> MTLLibrary {
    try lock.withLock {
      if let cached {
        return cached
      }
      let library = try device.makeLibrary(source: source, options: nil)
      cached = library
      return library
    }
  }
}
