import MunimMetalkit, {
  type MunimMetalkitViewRef,
  type Screenshot,
} from "munim-metalkit";
import { Platform } from "react-native";

import { PROBE_MAGIC, type CustomShaderResources } from "./customShader";

export type CheckResult = { ok: boolean; detail: string };
export type SelfTestReport = {
  platform: string;
  passed: number;
  failed: number;
  checks: Record<string, CheckResult>;
};

export type SelfTestArtifacts = {
  computeSample?: {
    input: number[];
    output: number[];
    gpuTimeMs: number | null;
  };
  texturePixels?: number[];
  screenshot?: Screenshot;
  customScreenshot?: Screenshot;
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

kernel void add_one(device float *data [[buffer(0)]],
                    constant uint &count [[buffer(1)]],
                    uint id [[thread_position_in_grid]]) {
  if (id >= count) { return; }
  data[id] += 1.0;
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

async function expectRejection(
  promise: Promise<unknown>,
  code: string,
): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (errorCode(error) === code) {
      return `rejected with ${code}`;
    }
    throw new Error(
      `expected ${code}, got ${errorCode(error)}: ${String(error)}`,
      { cause: error },
    );
  }
  throw new Error(`expected rejection with ${code}, but it resolved`);
}

function expectThrow(body: () => unknown, code: string): string {
  try {
    body();
  } catch (error) {
    if (errorCode(error) === code) return `threw ${code}`;
    throw new Error(`expected ${code}, got ${errorCode(error)}`, {
      cause: error,
    });
  }
  throw new Error(`expected a throw with ${code}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export type CustomViewHandle = {
  ref: MunimMetalkitViewRef;
  resources: CustomShaderResources;
};

export async function runSelfTest(
  getView: () => Promise<MunimMetalkitViewRef | null>,
  onArtifacts: (artifacts: SelfTestArtifacts) => void,
  getCustomView: () => Promise<CustomViewHandle | null>,
): Promise<SelfTestReport> {
  const checks: Record<string, CheckResult> = {};
  const artifacts: SelfTestArtifacts = {};

  const check = async (name: string, body: () => Promise<string>) => {
    try {
      checks[name] = { ok: true, detail: await body() };
    } catch (error) {
      checks[name] = {
        ok: false,
        detail: String((error as Error)?.message ?? error),
      };
    }
  };

  const available = MunimMetalkit.isMetalAvailable();

  if (!available) {
    // Android / web: the honest behaviour is "unavailable" everywhere.
    await check("isMetalAvailable is false off iOS", async () => {
      if (Platform.OS === "ios")
        throw new Error("Metal should be available on iOS");
      return "false";
    });
    await check("getDeviceInfo rejects", () =>
      expectRejection(MunimMetalkit.getDeviceInfo(), "ERR_METAL_UNAVAILABLE"),
    );
    await check("createBuffer rejects", () =>
      expectRejection(
        MunimMetalkit.createBuffer({ length: 16 }),
        "ERR_METAL_UNAVAILABLE",
      ),
    );
    await check("mapBuffer throws", async () =>
      expectThrow(() => MunimMetalkit.mapBuffer("x"), "ERR_METAL_UNAVAILABLE"),
    );
    await check("dispatchComputeBatch rejects", () =>
      expectRejection(
        MunimMetalkit.dispatchComputeBatch([
          { pipelineId: "x", threads: { width: 1 } },
        ]),
        "ERR_METAL_UNAVAILABLE",
      ),
    );
    await check("getMetalCapabilities rejects", () =>
      expectRejection(
        MunimMetalkit.getMetalCapabilities(),
        "ERR_METAL_UNAVAILABLE",
      ),
    );
    return finish(checks);
  }

  await check("isMetalAvailable", async () => "true");

  await check("getDeviceInfo", async () => {
    const info = await MunimMetalkit.getDeviceInfo();
    if (!info.name) throw new Error("empty device name");
    return `${info.name}, maxThreads ${info.maxThreadsPerThreadgroup.width}, families ${info.gpuFamilies.join("/")}`;
  });

  await check("getMetalCapabilities is consistent", async () => {
    const caps = await MunimMetalkit.getMetalCapabilities();
    const flags = [
      "compiledWithMetal4SDK",
      "metal3",
      "metal4",
      "mtl4CommandQueue",
      "mtl4Compiler",
      "tensors",
      "residencySets",
      "raytracing",
      "metalFXSpatial",
      "metalFXTemporal",
      "metalFXFrameInterpolation",
      "meshShaders",
      "nonUniformThreadgroups",
    ] as const;
    const notBoolean = flags.filter((key) => typeof caps[key] !== "boolean");
    if (notBoolean.length)
      throw new Error(`non-boolean fields: ${notBoolean.join(", ")}`);
    if (!/^\d+\.\d+$/.test(caps.osVersion))
      throw new Error(`osVersion ${caps.osVersion}`);
    if (caps.metal4 && !(caps.mtl4CommandQueue && caps.mtl4Compiler)) {
      throw new Error(
        "metal4 is true but the MTL4 queue or compiler could not be created",
      );
    }
    if (!caps.metal4 && !caps.unsupportedReason)
      throw new Error("metal4 false without a reason");
    if (!caps.metal4 && (caps.mtl4CommandQueue || caps.tensors)) {
      throw new Error("MTL4 objects reported without Metal 4 support");
    }
    const major = Number(caps.osVersion.split(".")[0]);
    const appleFamily = caps.appleGPUFamily ?? 0;
    if (caps.meshShaders !== appleFamily >= 7) {
      throw new Error(`meshShaders ${caps.meshShaders} on apple${appleFamily}`);
    }
    if (caps.nonUniformThreadgroups !== appleFamily >= 4) {
      throw new Error(
        `nonUniformThreadgroups ${caps.nonUniformThreadgroups} on apple${appleFamily}`,
      );
    }
    // Metal 4 = Apple7 (A14 / M1) and newer on iOS 26+, when the binary has the probes compiled in.
    const expectMetal4 =
      caps.compiledWithMetal4SDK && major >= 26 && appleFamily >= 7;
    if (caps.metal4 !== expectMetal4) {
      throw new Error(
        `metal4 ${caps.metal4}, expected ${expectMetal4} (iOS ${caps.osVersion}, apple${appleFamily})`,
      );
    }
    if (major >= 18 && !caps.residencySets)
      throw new Error("residency sets unavailable on iOS 18+");
    return JSON.stringify(caps);
  });

  await check("GPU family report matches getDeviceInfo", async () => {
    const [info, caps] = await Promise.all([
      MunimMetalkit.getDeviceInfo(),
      MunimMetalkit.getMetalCapabilities(),
    ]);
    const highest = info.gpuFamilies
      .map((name) => Number(name.replace("apple", "")))
      .reduce((a, b) => Math.max(a, b), 0);
    if (!caps.appleGPUFamily || caps.appleGPUFamily !== highest) {
      throw new Error(
        `capabilities apple${caps.appleGPUFamily}, deviceInfo apple${highest}`,
      );
    }
    return `apple${highest}`;
  });

  let libraryId: string | undefined;
  await check("createShaderLibrary", async () => {
    libraryId = await MunimMetalkit.createShaderLibrary(DOUBLE_SHADER);
    const names = await MunimMetalkit.getShaderLibraryFunctionNames(libraryId);
    if (!names.includes("double_values"))
      throw new Error(`functions: ${names.join(", ")}`);
    return names.sort().join(", ");
  });

  await check("shader compile error is reported", () =>
    expectRejection(
      MunimMetalkit.createShaderLibrary("kernel void broken( {"),
      "ERR_SHADER_COMPILATION",
    ),
  );

  await check("compute doubles an array on the GPU", async () => {
    if (!libraryId) throw new Error("no library");
    const pipeline = await MunimMetalkit.createComputePipelineState(
      libraryId,
      "double_values",
    );
    const input = new Float32Array(COMPUTE_COUNT);
    for (let i = 0; i < COMPUTE_COUNT; i++) input[i] = i * 0.5 - 7;
    const inBuffer = await MunimMetalkit.createBufferWithData(input);
    const outBuffer = await MunimMetalkit.createBuffer({
      length: input.byteLength,
    });
    const countBuffer = await MunimMetalkit.createBufferWithData(
      new Uint32Array([COMPUTE_COUNT]),
    );
    const width = 64;
    const result = await MunimMetalkit.dispatchCompute(
      pipeline.id,
      [inBuffer.id, outBuffer.id, countBuffer.id],
      { width: Math.ceil(COMPUTE_COUNT / width) },
      { threadsPerThreadgroup: { width } },
    );
    const output = new Float32Array(
      await MunimMetalkit.getBufferContents(outBuffer.id),
    );
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
      throw new Error(
        `mismatch at ${bad}: ${output[bad]} != ${input[bad]! * 2}`,
      );
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
    const buffer = await MunimMetalkit.createBufferWithData(
      data,
      "StorageModePrivate",
    );
    await MunimMetalkit.updateBuffer(buffer.id, new Uint8Array([42, 43]), 2);
    const back = new Uint8Array(
      await MunimMetalkit.getBufferContents(buffer.id),
    );
    await MunimMetalkit.releaseBuffer(buffer.id);
    const expected = new Uint8Array([1, 2, 42, 43, 5, 6, 7, 8]);
    if (!bytesEqual(back, expected) || buffer.storageMode !== "Private") {
      throw new Error(`got [${Array.from(back)}] (${buffer.storageMode})`);
    }
    return "blit upload + readback ok";
  });

  await check("empty data rejects instead of crashing", () =>
    expectRejection(
      MunimMetalkit.createBufferWithData(new Uint8Array(0)),
      "ERR_INVALID_ARGUMENT",
    ),
  );

  await check("updateBuffer bounds are checked", async () => {
    const buffer = await MunimMetalkit.createBuffer({ length: 4 });
    try {
      return await expectRejection(
        MunimMetalkit.updateBuffer(buffer.id, new Uint8Array(8)),
        "ERR_INVALID_ARGUMENT",
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
        await MunimMetalkit.readTexture(texture.id, {
          x: 1,
          y: 2,
          width: 2,
          height: 1,
        }),
      );
      await MunimMetalkit.releaseTexture(texture.id);
      const expectedPatch = pattern.slice((2 * 4 + 1) * 4, (2 * 4 + 3) * 4);
      if (!bytesEqual(whole, pattern)) throw new Error("full readback differs");
      if (!bytesEqual(patch, expectedPatch))
        throw new Error("region readback differs");
      if (storageMode === "Shared")
        artifacts.texturePixels = Array.from(whole.slice(0, 8));
      return `${texture.width}x${texture.height} ${texture.storageMode}`;
    });
  }

  await check("Depth24Unorm_Stencil8 is rejected on iOS", () =>
    expectRejection(
      MunimMetalkit.createTexture({
        width: 4,
        height: 4,
        pixelFormat: "Depth24Unorm_Stencil8",
      }),
      "ERR_UNSUPPORTED",
    ),
  );

  await check("mapBuffer aliases the buffer's memory (zero-copy)", async () => {
    const buffer = await MunimMetalkit.createBufferWithData(
      new Uint32Array([1, 2, 3, 4]),
    );
    try {
      const mapped = new Uint32Array(MunimMetalkit.mapBuffer(buffer.id));
      if (mapped.length !== 4 || mapped[2] !== 3) {
        throw new Error(`mapped [${Array.from(mapped)}]`);
      }
      // A write through the mapping is visible to a native read ...
      mapped[0] = 0xdeadbeef;
      const copy = new Uint32Array(
        await MunimMetalkit.getBufferContents(buffer.id),
      );
      if (copy[0] !== 0xdeadbeef) throw new Error("native read missed the write");
      // ... and a native write is visible through the mapping, without another call.
      await MunimMetalkit.updateBuffer(buffer.id, new Uint32Array([77]), 12);
      if (mapped[3] !== 77) throw new Error(`mapping shows ${mapped[3]}`);
      return "JS writes reach Metal and Metal writes reach JS";
    } finally {
      await MunimMetalkit.releaseBuffer(buffer.id);
    }
  });

  await check("mapBuffer rejects Private buffers", async () => {
    const buffer = await MunimMetalkit.createBuffer({
      length: 16,
      options: "StorageModePrivate",
    });
    try {
      return expectThrow(
        () => MunimMetalkit.mapBuffer(buffer.id),
        "ERR_INVALID_ARGUMENT",
      );
    } finally {
      await MunimMetalkit.releaseBuffer(buffer.id);
    }
  });

  await check("dispatchComputeBatch runs steps in order", async () => {
    if (!libraryId) throw new Error("no library");
    const count = 1000; // not a multiple of the threadgroup size
    const [double, addOne] = await Promise.all([
      MunimMetalkit.createComputePipelineState(libraryId, "double_values"),
      MunimMetalkit.createComputePipelineState(libraryId, "add_one"),
    ]);
    const input = new Float32Array(count);
    for (let i = 0; i < count; i++) input[i] = i - 300;
    const [inBuffer, outBuffer, countBuffer] = await Promise.all([
      MunimMetalkit.createBufferWithData(input),
      MunimMetalkit.createBuffer({ length: input.byteLength }),
      MunimMetalkit.createBufferWithData(new Uint32Array([count])),
    ]);
    try {
      const result = await MunimMetalkit.dispatchComputeBatch([
        {
          pipelineId: double.id,
          buffers: [inBuffer.id, outBuffer.id, countBuffer.id],
          threads: { width: count },
        },
        {
          pipelineId: addOne.id,
          buffers: [outBuffer.id, countBuffer.id],
          threads: { width: count },
          repeatCount: 5,
        },
      ]);
      const output = new Float32Array(MunimMetalkit.mapBuffer(outBuffer.id));
      const bad = output.findIndex((value, i) => value !== input[i]! * 2 + 5);
      if (bad !== -1) {
        throw new Error(`index ${bad}: ${output[bad]} != ${input[bad]! * 2 + 5}`);
      }
      if (result.dispatchCount !== 6) {
        throw new Error(`dispatchCount ${result.dispatchCount}`);
      }
      return `6 dispatches, one submission, gpu ${result.gpuTimeMs?.toFixed(3)} ms`;
    } finally {
      await Promise.all([
        MunimMetalkit.releaseBuffer(inBuffer.id),
        MunimMetalkit.releaseBuffer(outBuffer.id),
        MunimMetalkit.releaseBuffer(countBuffer.id),
        MunimMetalkit.releaseComputePipelineState(double.id),
        MunimMetalkit.releaseComputePipelineState(addOne.id),
      ]);
    }
  });

  await check("dispatchComputeBatch validates steps", () =>
    expectRejection(
      MunimMetalkit.dispatchComputeBatch([{ pipelineId: "missing" }]),
      "ERR_INVALID_ARGUMENT",
    ),
  );

  await check("unimplemented APIs reject loudly", async () => {
    await expectRejection(
      MunimMetalkit.createMesh({
        vertexBuffers: [],
        vertexCount: 0,
        primitiveType: "Triangle",
      }),
      "ERR_NOT_IMPLEMENTED",
    );
    await expectRejection(
      MunimMetalkit.createCanvas2D(64, 64),
      "ERR_NOT_IMPLEMENTED",
    );
    await expectRejection(
      MunimMetalkit.startAnimation("x"),
      "ERR_NOT_IMPLEMENTED",
    );
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
    if (shot.base64.length < 2000)
      throw new Error(`PNG suspiciously small (${shot.base64.length} chars)`);
    const file = await MunimMetalkit.takeScreenshot({ result: "file" });
    if (!file.uri?.startsWith("file://"))
      throw new Error("file screenshot has no uri");
    return `${shot.width}x${shot.height}, ${Math.round((shot.base64.length * 3) / 4 / 1024)} KB PNG`;
  });

  await check("custom view: per-frame compute + uniforms, no JS per frame", async () => {
    const custom = await getCustomView();
    if (!custom) throw new Error("custom view did not load");
    const { probe, tint } = custom.resources;
    // Written through mapped memory: no native call. The next frame snapshots it.
    tint[0] = 0.25;
    await sleep(300);
    const first = probe[0]!;
    if (probe[3] !== PROBE_MAGIC) throw new Error(`probe magic ${probe[3]}`);
    const tintSeen = new Float32Array(new Uint32Array([probe[1]!]).buffer)[0];
    if (tintSeen !== 0.25) throw new Error(`kernel saw tint ${tintSeen}`);
    await sleep(300);
    const second = probe[0]!;
    if (!(second > first)) throw new Error(`frameIndex ${first} -> ${second}`);
    tint[0] = 1;
    return `frames ${first} -> ${second} in 300 ms, render width ${probe[2]}`;
  });

  await check("custom view screenshot", async () => {
    const custom = await getCustomView();
    if (!custom) throw new Error("custom view did not load");
    const shot = await custom.ref.takeScreenshot();
    if (!shot.base64?.startsWith("iVBORw0KGgo")) throw new Error("not a PNG");
    if (shot.base64.length < 2000) {
      throw new Error(`PNG suspiciously small (${shot.base64.length} chars)`);
    }
    artifacts.customScreenshot = shot;
    return `${shot.width}x${shot.height}`;
  });

  await check("getPerformanceInfo reports real data", async () => {
    const info = await MunimMetalkit.getPerformanceInfo();
    if (info.framesRendered <= 0) throw new Error("no frames rendered");
    if (!(
      typeof info.lastComputeGpuTime === "number" && info.lastComputeGpuTime > 0
    )) {
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
  return {
    platform: Platform.OS,
    passed,
    failed: values.length - passed,
    checks,
  };
}
