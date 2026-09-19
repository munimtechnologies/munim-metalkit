import MunimMetalkit, { type MunimMetalkitViewRef, type Screenshot } from "munim-metalkit";
import { Platform } from "react-native";

export type CheckResult = { ok: boolean; detail: string };
export type SelfTestReport = {
  platform: string;
  passed: number;
  failed: number;
  checks: Record<string, CheckResult>;
};

export type SelfTestArtifacts = {
  computeSample?: { input: number[]; output: number[]; gpuTimeMs: number | null };
  texturePixels?: number[];
  screenshot?: Screenshot;
};

const COMPUTE_COUNT = 1024;

export const DOUBLE_SHADER = `
#include <metal_stdlib>
using namespace metal;

kernel void double_values(device const float *input [[buffer(0)]],
                          device float *output [[buffer(1)]],
                          constant uint &count [[buffer(2)]],
                          uint id [[thread_position_in_grid]]) {
  if (id >= count) { return; }
  output[id] = input[id] * 2.0;
}

struct VOut { float4 position [[position]]; };

vertex VOut fullscreen_vertex(uint vid [[vertex_id]]) {
  float2 p = float2((vid << 1) & 2, vid & 2);
  VOut out;
  out.position = float4(p * 2.0 - 1.0, 0.0, 1.0);
  return out;
}

fragment float4 solid_fragment(VOut in [[stage_in]]) {
  return float4(1.0, 0.5, 0.0, 1.0);
}
`;

function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

async function expectRejection(promise: Promise<unknown>, code: string): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (errorCode(error) === code) {
      return `rejected with ${code}`;
    }
    throw new Error(`expected ${code}, got ${errorCode(error)}: ${String(error)}`);
  }
  throw new Error(`expected rejection with ${code}, but it resolved`);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function runSelfTest(
  getView: () => Promise<MunimMetalkitViewRef | null>,
  onArtifacts: (artifacts: SelfTestArtifacts) => void
): Promise<SelfTestReport> {
  const checks: Record<string, CheckResult> = {};
  const artifacts: SelfTestArtifacts = {};

  const check = async (name: string, body: () => Promise<string>) => {
    try {
      checks[name] = { ok: true, detail: await body() };
    } catch (error) {
      checks[name] = { ok: false, detail: String((error as Error)?.message ?? error) };
    }
  };

  const available = MunimMetalkit.isMetalAvailable();

  if (!available) {
    // Android / web: the honest behaviour is "unavailable" everywhere.
    await check("isMetalAvailable is false off iOS", async () => {
      if (Platform.OS === "ios") throw new Error("Metal should be available on iOS");
      return "false";
    });
    await check("getDeviceInfo rejects", () =>
      expectRejection(MunimMetalkit.getDeviceInfo(), "ERR_METAL_UNAVAILABLE")
    );
    await check("createBuffer rejects", () =>
      expectRejection(MunimMetalkit.createBuffer({ length: 16 }), "ERR_METAL_UNAVAILABLE")
    );
    return finish(checks);
  }

  await check("isMetalAvailable", async () => "true");

  await check("getDeviceInfo", async () => {
    const info = await MunimMetalkit.getDeviceInfo();
    if (!info.name) throw new Error("empty device name");
    return `${info.name}, maxThreads ${info.maxThreadsPerThreadgroup.width}, families ${info.gpuFamilies.join("/")}`;
  });

  let libraryId: string | undefined;
  await check("createShaderLibrary", async () => {
    libraryId = await MunimMetalkit.createShaderLibrary(DOUBLE_SHADER);
    const names = await MunimMetalkit.getShaderLibraryFunctionNames(libraryId);
    if (!names.includes("double_values")) throw new Error(`functions: ${names.join(", ")}`);
    return names.sort().join(", ");
  });

  await check("shader compile error is reported", () =>
    expectRejection(MunimMetalkit.createShaderLibrary("kernel void broken( {"), "ERR_SHADER_COMPILATION")
  );

  await check("compute doubles an array on the GPU", async () => {
    if (!libraryId) throw new Error("no library");
    const pipeline = await MunimMetalkit.createComputePipelineState(libraryId, "double_values");
    const input = new Float32Array(COMPUTE_COUNT);
    for (let i = 0; i < COMPUTE_COUNT; i++) input[i] = i * 0.5 - 7;
    const inBuffer = await MunimMetalkit.createBufferWithData(input);
    const outBuffer = await MunimMetalkit.createBuffer({ length: input.byteLength });
    const countBuffer = await MunimMetalkit.createBufferWithData(new Uint32Array([COMPUTE_COUNT]));
    const width = 64;
    const result = await MunimMetalkit.dispatchCompute(
      pipeline.id,
      [inBuffer.id, outBuffer.id, countBuffer.id],
      { width: Math.ceil(COMPUTE_COUNT / width) },
      { threadsPerThreadgroup: { width } }
    );
    const output = new Float32Array(await MunimMetalkit.getBufferContents(outBuffer.id));
    const bad = output.findIndex((value, i) => value !== input[i]! * 2);
    await Promise.all([
      MunimMetalkit.releaseBuffer(inBuffer.id),
      MunimMetalkit.releaseBuffer(outBuffer.id),
      MunimMetalkit.releaseBuffer(countBuffer.id),
      MunimMetalkit.releaseComputePipelineState(pipeline.id),
    ]);
    artifacts.computeSample = {
      input: Array.from(input.slice(0, 6)),
      output: Array.from(output.slice(0, 6)),
      gpuTimeMs: result.gpuTimeMs,
    };
    if (output.length !== COMPUTE_COUNT || bad !== -1) {
      throw new Error(`mismatch at ${bad}: ${output[bad]} != ${input[bad]! * 2}`);
    }
    return `${COMPUTE_COUNT} floats doubled, gpu ${result.gpuTimeMs?.toFixed(3)} ms`;
  });

  await check("createRenderPipelineState (vertex + fragment)", async () => {
    if (!libraryId) throw new Error("no library");
    const pipeline = await MunimMetalkit.createRenderPipelineState({
      libraryId,
      vertexFunction: "fullscreen_vertex",
      fragmentFunction: "solid_fragment",
      colorAttachments: [{ pixelFormat: "BGRA8Unorm" }],
    });
    await MunimMetalkit.releaseRenderPipelineState(pipeline.id);
    return pipeline.id;
  });

  await check("private buffer round trip", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const buffer = await MunimMetalkit.createBufferWithData(data, "StorageModePrivate");
    await MunimMetalkit.updateBuffer(buffer.id, new Uint8Array([42, 43]), 2);
    const back = new Uint8Array(await MunimMetalkit.getBufferContents(buffer.id));
    await MunimMetalkit.releaseBuffer(buffer.id);
    const expected = new Uint8Array([1, 2, 42, 43, 5, 6, 7, 8]);
    if (!bytesEqual(back, expected) || buffer.storageMode !== "Private") {
      throw new Error(`got [${Array.from(back)}] (${buffer.storageMode})`);
    }
    return "blit upload + readback ok";
  });

  await check("empty data rejects instead of crashing", () =>
    expectRejection(MunimMetalkit.createBufferWithData(new Uint8Array(0)), "ERR_INVALID_ARGUMENT")
  );

  await check("updateBuffer bounds are checked", async () => {
    const buffer = await MunimMetalkit.createBuffer({ length: 4 });
    try {
      return await expectRejection(
        MunimMetalkit.updateBuffer(buffer.id, new Uint8Array(8)),
        "ERR_INVALID_ARGUMENT"
      );
    } finally {
      await MunimMetalkit.releaseBuffer(buffer.id);
    }
  });

  const pattern = new Uint8Array(4 * 4 * 4);
  for (let i = 0; i < pattern.length; i++) pattern[i] = (i * 37) & 0xff;

  for (const storageMode of ["Shared", "Private"] as const) {
    await check(`texture create/update/read (${storageMode})`, async () => {
      const texture = await MunimMetalkit.createTexture({
        width: 4,
        height: 4,
        pixelFormat: "RGBA8Unorm",
        storageMode,
      });
      await MunimMetalkit.updateTexture(texture.id, pattern);
      const whole = new Uint8Array(await MunimMetalkit.readTexture(texture.id));
      const patch = new Uint8Array(
        await MunimMetalkit.readTexture(texture.id, { x: 1, y: 2, width: 2, height: 1 })
      );
      await MunimMetalkit.releaseTexture(texture.id);
      const expectedPatch = pattern.slice((2 * 4 + 1) * 4, (2 * 4 + 3) * 4);
      if (!bytesEqual(whole, pattern)) throw new Error("full readback differs");
      if (!bytesEqual(patch, expectedPatch)) throw new Error("region readback differs");
      if (storageMode === "Shared") artifacts.texturePixels = Array.from(whole.slice(0, 8));
      return `${texture.width}x${texture.height} ${texture.storageMode}`;
    });
  }

  await check("Depth24Unorm_Stencil8 is rejected on iOS", () =>
    expectRejection(
      MunimMetalkit.createTexture({ width: 4, height: 4, pixelFormat: "Depth24Unorm_Stencil8" }),
      "ERR_UNSUPPORTED"
    )
  );

  await check("unimplemented APIs reject loudly", async () => {
    await expectRejection(
      MunimMetalkit.createMesh({ vertexBuffers: [], vertexCount: 0, primitiveType: "Triangle" }),
      "ERR_NOT_IMPLEMENTED"
    );
    await expectRejection(MunimMetalkit.createCanvas2D(64, 64), "ERR_NOT_IMPLEMENTED");
    await expectRejection(MunimMetalkit.startAnimation("x"), "ERR_NOT_IMPLEMENTED");
    return "createMesh, createCanvas2D, startAnimation -> ERR_NOT_IMPLEMENTED";
  });

  await check("MTKView screenshot", async () => {
    const view = await getView();
    if (!view) throw new Error("view did not load");
    const shot = await view.takeScreenshot();
    artifacts.screenshot = shot;
    if (!shot.base64?.startsWith("iVBORw0KGgo")) throw new Error("not a PNG");
    if (shot.width <= 0 || shot.height <= 0) throw new Error("empty image");
    // A uniformly black frame compresses to a few hundred bytes; the triangle does not.
    if (shot.base64.length < 2000) throw new Error(`PNG suspiciously small (${shot.base64.length} chars)`);
    const file = await MunimMetalkit.takeScreenshot({ result: "file" });
    if (!file.uri?.startsWith("file://")) throw new Error("file screenshot has no uri");
    return `${shot.width}x${shot.height}, ${Math.round((shot.base64.length * 3) / 4 / 1024)} KB PNG`;
  });

  await check("getPerformanceInfo reports real data", async () => {
    const info = await MunimMetalkit.getPerformanceInfo();
    if (info.framesRendered <= 0) throw new Error("no frames rendered");
    if (!(typeof info.lastComputeGpuTime === "number" && info.lastComputeGpuTime > 0)) {
      throw new Error(`lastComputeGpuTime ${info.lastComputeGpuTime}`);
    }
    return `${info.deviceName}, ${info.framesRendered} frames, frame ${info.frameTime.toFixed(2)} ms, gpu frame ${info.gpuFrameTime?.toFixed(3)} ms`;
  });

  if (libraryId) await MunimMetalkit.releaseShaderLibrary(libraryId);
  onArtifacts(artifacts);
  return finish(checks);
}

function finish(checks: Record<string, CheckResult>): SelfTestReport {
  const values = Object.values(checks);
  const passed = values.filter((c) => c.ok).length;
  return { platform: Platform.OS, passed, failed: values.length - passed, checks };
}
