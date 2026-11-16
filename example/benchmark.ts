import MunimMetalkit from "munim-metalkit";

export type BenchmarkResult = Record<string, string>;

const UPLOAD_BYTES = 4 * 1024 * 1024;
const UPLOAD_ROUNDS = 30;
const DISPATCHES = 200;

const ADD_ONE = `
#include <metal_stdlib>
using namespace metal;
kernel void bench_add_one(device float *data [[buffer(0)]], uint id [[thread_position_in_grid]]) {
  data[id] += 1.0;
}`;

function ms(start: number): number {
  return performance.now() - start;
}

/**
 * Times the data paths this release changed, on the device:
 * - uploading 4 MB with `updateBuffer` (now one memcpy on the JS thread for Shared buffers) vs.
 *   writing the same bytes through `mapBuffer` (no native call at all);
 * - `DISPATCHES` compute dispatches awaited one by one vs. one `dispatchComputeBatch`.
 */
export async function runBenchmark(): Promise<BenchmarkResult> {
  const result: BenchmarkResult = {};
  const payload = new Uint8Array(UPLOAD_BYTES);
  for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;

  const shared = await MunimMetalkit.createBuffer({ length: UPLOAD_BYTES });
  const privateBuffer = await MunimMetalkit.createBuffer({
    length: UPLOAD_BYTES,
    options: "StorageModePrivate",
  });
  try {
    let start = performance.now();
    for (let i = 0; i < UPLOAD_ROUNDS; i++) {
      await MunimMetalkit.updateBuffer(shared.id, payload);
    }
    result["updateBuffer 4 MB (Shared)"] =
      `${(ms(start) / UPLOAD_ROUNDS).toFixed(3)} ms/upload`;

    start = performance.now();
    for (let i = 0; i < UPLOAD_ROUNDS; i++) {
      await MunimMetalkit.updateBuffer(privateBuffer.id, payload);
    }
    result["updateBuffer 4 MB (Private, blit)"] =
      `${(ms(start) / UPLOAD_ROUNDS).toFixed(3)} ms/upload`;

    const mapped = new Uint8Array(MunimMetalkit.mapBuffer(shared.id));
    start = performance.now();
    for (let i = 0; i < UPLOAD_ROUNDS; i++) {
      mapped.set(payload);
    }
    result["mapBuffer + set 4 MB"] =
      `${(ms(start) / UPLOAD_ROUNDS).toFixed(3)} ms/upload`;

    start = performance.now();
    for (let i = 0; i < UPLOAD_ROUNDS; i++) {
      await MunimMetalkit.getBufferContents(shared.id);
    }
    result["getBufferContents 4 MB"] =
      `${(ms(start) / UPLOAD_ROUNDS).toFixed(3)} ms/read`;
  } finally {
    await MunimMetalkit.releaseBuffer(shared.id);
    await MunimMetalkit.releaseBuffer(privateBuffer.id);
  }

  const library = await MunimMetalkit.createShaderLibrary(ADD_ONE);
  const pipeline = await MunimMetalkit.createComputePipelineState(
    library,
    "bench_add_one",
  );
  const data = await MunimMetalkit.createBufferWithData(
    new Float32Array(1024),
  );
  try {
    let start = performance.now();
    for (let i = 0; i < DISPATCHES; i++) {
      await MunimMetalkit.dispatchCompute(
        pipeline.id,
        [data.id],
        { width: 16 },
        { threadsPerThreadgroup: { width: 64 } },
      );
    }
    const loop = ms(start);
    start = performance.now();
    const batch = await MunimMetalkit.dispatchComputeBatch([
      {
        pipelineId: pipeline.id,
        buffers: [data.id],
        threads: { width: 1024 },
        repeatCount: DISPATCHES,
      },
    ]);
    const batched = ms(start);
    const values = new Float32Array(
      await MunimMetalkit.getBufferContents(data.id),
    );
    result[`${DISPATCHES} x await dispatchCompute`] = `${loop.toFixed(2)} ms`;
    result[`dispatchComputeBatch (repeatCount ${DISPATCHES})`] =
      `${batched.toFixed(2)} ms (gpu ${batch.gpuTimeMs?.toFixed(2) ?? "?"} ms)`;
    result["batch speed-up"] = `${(loop / batched).toFixed(1)}x`;
    result["result check"] =
      values[0] === DISPATCHES * 2 && values[1023] === DISPATCHES * 2
        ? "ok"
        : `unexpected ${values[0]}`;
  } finally {
    await MunimMetalkit.releaseBuffer(data.id);
    await MunimMetalkit.releaseComputePipelineState(pipeline.id);
    await MunimMetalkit.releaseShaderLibrary(library);
  }
  return result;
}
