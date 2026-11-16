import MunimMetalkit, {
  FULLSCREEN_TRIANGLE_MSL,
  MUNIM_FRAME_MSL,
} from "munim-metalkit";

/** Size of the texture the per-frame kernel writes and the fragment shader samples. */
export const WAVE_SIZE = 256;

/** Marker the kernel writes into `probe[3]`, so the self-test knows the kernel ran. */
export const PROBE_MAGIC = 0xc0ffee;

/**
 * A GPU-driven view: every display-link frame the view dispatches `example_wave` (writes an
 * animated pattern into a texture, plus a few values into a probe buffer) and then draws a
 * fullscreen triangle whose fragment shader samples that texture and multiplies it by a tint read
 * from the uniform buffer. JavaScript only writes the tint into mapped memory; it is never called
 * per frame.
 */
export const CUSTOM_SHADER = `${MUNIM_FRAME_MSL}
${FULLSCREEN_TRIANGLE_MSL}
struct ExampleParams {
  float4 tint;
};

kernel void example_wave(texture2d<float, access::write> out [[texture(0)]],
                         device uint *probe [[buffer(0)]],
                         constant ExampleParams &params [[buffer(29)]],
                         constant MunimFrame &frame [[buffer(30)]],
                         uint2 gid [[thread_position_in_grid]]) {
  if (gid.x >= out.get_width() || gid.y >= out.get_height()) { return; }
  float2 uv = float2(gid) / float2(out.get_width(), out.get_height());
  float wave = 0.5 + 0.5 * sin(10.0 * uv.x + frame.time * 2.0) * cos(10.0 * uv.y - frame.time * 1.3);
  out.write(float4(wave, uv.x, uv.y, 1.0), gid);
  if (gid.x == 0 && gid.y == 0) {
    probe[0] = frame.frameIndex;
    probe[1] = as_type<uint>(params.tint.x);
    probe[2] = uint(frame.resolution.x);
    probe[3] = ${PROBE_MAGIC}u;
  }
}

fragment float4 example_fragment(FullscreenOut in [[stage_in]],
                                 texture2d<float> wave [[texture(0)]],
                                 constant ExampleParams &params [[buffer(29)]]) {
  constexpr sampler linearSampler(filter::linear, address::clamp_to_edge);
  return float4(wave.sample(linearSampler, in.uv).rgb * params.tint.rgb, 1.0);
}
`;

export type CustomShaderResources = {
  renderPipelineId: string;
  computePipelineId: string;
  textureId: string;
  probeBufferId: string;
  uniformBufferId: string;
  /** Mapped `probe` buffer: [frameIndex, tint.x bits, resolution.x, PROBE_MAGIC]. */
  probe: Uint32Array;
  /** Mapped uniform buffer: `ExampleParams.tint` (RGBA). Writes reach the next frame. */
  tint: Float32Array;
  release(): Promise<void>;
};

export async function createCustomShader(): Promise<CustomShaderResources> {
  const libraryId = await MunimMetalkit.createShaderLibrary(CUSTOM_SHADER);
  const [render, compute, texture, probeBuffer, uniformBuffer] =
    await Promise.all([
      MunimMetalkit.createRenderPipelineState({
        libraryId,
        vertexFunction: "munim_fullscreen_vertex",
        fragmentFunction: "example_fragment",
        colorAttachments: [{ pixelFormat: "BGRA8Unorm" }],
      }),
      MunimMetalkit.createComputePipelineState(libraryId, "example_wave"),
      MunimMetalkit.createTexture({
        width: WAVE_SIZE,
        height: WAVE_SIZE,
        pixelFormat: "RGBA8Unorm",
        usage: ["ShaderRead", "ShaderWrite"],
        storageMode: "Private",
      }),
      MunimMetalkit.createBuffer({ length: 16 }),
      MunimMetalkit.createBufferWithData(new Float32Array([1, 1, 1, 1])),
    ]);
  // Pipelines keep what they need from the library.
  await MunimMetalkit.releaseShaderLibrary(libraryId);

  return {
    renderPipelineId: render.id,
    computePipelineId: compute.id,
    textureId: texture.id,
    probeBufferId: probeBuffer.id,
    uniformBufferId: uniformBuffer.id,
    probe: new Uint32Array(MunimMetalkit.mapBuffer(probeBuffer.id)),
    tint: new Float32Array(MunimMetalkit.mapBuffer(uniformBuffer.id)),
    async release() {
      await Promise.all([
        MunimMetalkit.releaseRenderPipelineState(render.id),
        MunimMetalkit.releaseComputePipelineState(compute.id),
        MunimMetalkit.releaseTexture(texture.id),
        MunimMetalkit.releaseBuffer(probeBuffer.id),
        MunimMetalkit.releaseBuffer(uniformBuffer.id),
      ]);
    },
  };
}
