/**
 * The contract between `MunimMetalkitView` and the app's shaders (render pipeline and per-frame
 * compute pipeline):
 *
 * - `buffers[i]` → `[[buffer(i)]]`, `textures[i]` → `[[texture(i)]]` (vertex, fragment, kernel).
 * - `uniformBufferId` → `[[buffer(UNIFORMS_INDEX)]]`, snapshotted every frame.
 * - The view's `MunimFrame` struct → `[[buffer(FRAME_UNIFORMS_INDEX)]]`.
 */

/** Buffer index of the per-frame `MunimFrame` struct. */
export const FRAME_UNIFORMS_INDEX = 30;

/** Buffer index of the `uniformBufferId` snapshot. */
export const UNIFORMS_INDEX = 29;

/** Size in bytes of `MunimFrame`. */
export const FRAME_UNIFORMS_BYTE_LENGTH = 24;

/**
 * Metal Shading Language declaration of the per-frame struct the view binds at
 * `[[buffer(30)]]`. Paste it (or interpolate it) into your shader source:
 *
 * ```ts
 * const source = `${MUNIM_FRAME_MSL}
 * fragment float4 plasma(VOut in [[stage_in]], constant MunimFrame &frame [[buffer(30)]]) { ... }`;
 * ```
 */
export const MUNIM_FRAME_MSL = `#include <metal_stdlib>
using namespace metal;

struct MunimFrame {
  float time;        // seconds since the view was created
  float deltaTime;   // seconds since the previous frame
  float2 resolution; // render target size in pixels (scaled by renderScale)
  uint frameIndex;   // frames encoded so far
  float renderScale; // 1, or the renderScale prop while MetalFX upscaling is active
};
`;

/**
 * A vertex function that covers the render target with one triangle (`vertexCount: 3`) and passes
 * `uv` (0..1, origin top-left) to the fragment stage. Declares `FullscreenOut`.
 */
export const FULLSCREEN_TRIANGLE_MSL = `struct FullscreenOut {
  float4 position [[position]];
  float2 uv;
};

vertex FullscreenOut munim_fullscreen_vertex(uint vid [[vertex_id]]) {
  float2 p = float2((vid << 1) & 2, vid & 2);
  FullscreenOut out;
  out.position = float4(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = float2(p.x, 1.0 - p.y);
  return out;
}
`;
