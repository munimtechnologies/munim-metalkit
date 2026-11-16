const mockNative = {
  isMetalAvailable: jest.fn(() => true),
  mapBuffer: jest.fn(),
  dispatchComputeBatch: jest.fn(),
  getMetalCapabilities: jest.fn(),
  updateBuffer: jest.fn(),
};

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }), {
  virtual: true,
});
jest.mock(
  "react-native-nitro-modules",
  () => ({ NitroModules: { createHybridObject: () => mockNative } }),
  { virtual: true },
);

import MunimMetalkit from "../src/MunimMetalkitModule";
import WebModule from "../src/MunimMetalkitModule.web";
import { ASYNC_METHOD_NAMES } from "../src/methodNames";

describe("MunimMetalkit module", () => {
  beforeEach(() => jest.clearAllMocks());

  it("exposes every async method on native and web", () => {
    for (const name of ASYNC_METHOD_NAMES) {
      expect(typeof (MunimMetalkit as unknown as Record<string, unknown>)[name]).toBe(
        "function",
      );
      expect(typeof (WebModule as unknown as Record<string, unknown>)[name]).toBe(
        "function",
      );
    }
    expect(typeof MunimMetalkit.mapBuffer).toBe("function");
    expect(typeof WebModule.mapBuffer).toBe("function");
  });

  it("mapBuffer returns the native ArrayBuffer itself", () => {
    const memory = new ArrayBuffer(32);
    mockNative.mapBuffer.mockReturnValue(memory);
    expect(MunimMetalkit.mapBuffer("buf")).toBe(memory);
    expect(mockNative.mapBuffer).toHaveBeenCalledWith("buf");
  });

  it("mapBuffer throws coded errors synchronously", () => {
    mockNative.mapBuffer.mockImplementation(() => {
      throw new Error("[ERR_INVALID_ARGUMENT] mapBuffer: Private buffers ...");
    });
    expect(() => MunimMetalkit.mapBuffer("private")).toThrow(
      expect.objectContaining({ code: "ERR_INVALID_ARGUMENT" }),
    );
    expect(() => WebModule.mapBuffer("x")).toThrow(
      expect.objectContaining({ code: "ERR_METAL_UNAVAILABLE" }),
    );
  });

  it("dispatchComputeBatch maps steps and the result", async () => {
    mockNative.dispatchComputeBatch.mockResolvedValue({
      cpuTimeMs: 1.5,
      dispatchCount: 11,
    });
    const result = await MunimMetalkit.dispatchComputeBatch([
      { pipelineId: "a", buffers: ["x"], threads: { width: 100 } },
      { pipelineId: "b", threadgroups: { width: 2 }, repeatCount: 10 },
    ]);
    expect(result).toEqual({
      gpuTimeMs: null,
      cpuTimeMs: 1.5,
      dispatchCount: 11,
    });
    expect(mockNative.dispatchComputeBatch).toHaveBeenCalledWith([
      expect.objectContaining({ pipelineId: "a", threads: { width: 100 } }),
      expect.objectContaining({ pipelineId: "b", repeatCount: 10 }),
    ]);
  });

  it("reports the MetalFX and mesh-shader capabilities", async () => {
    mockNative.getMetalCapabilities.mockResolvedValue({
      osVersion: "27.0",
      compiledWithMetal4SDK: true,
      appleGPUFamily: 9,
      metal3: true,
      metal4: true,
      mtl4CommandQueue: true,
      mtl4Compiler: true,
      tensors: true,
      residencySets: true,
      raytracing: true,
      metalFXSpatial: true,
      metalFXTemporal: true,
      metalFXFrameInterpolation: false,
      meshShaders: true,
      nonUniformThreadgroups: true,
    });
    const caps = await MunimMetalkit.getMetalCapabilities();
    expect(caps).toMatchObject({
      metalFXSpatial: true,
      metalFXTemporal: true,
      metalFXFrameInterpolation: false,
      meshShaders: true,
      nonUniformThreadgroups: true,
      appleGPUFamily: 9,
    });
    expect(caps.unsupportedReason).toBeUndefined();
  });

  it("sends a sub-view's bytes, not its whole backing buffer", async () => {
    mockNative.updateBuffer.mockResolvedValue(undefined);
    const backing = new Float32Array([1, 2, 3, 4]);
    await MunimMetalkit.updateBuffer("buf", backing.subarray(1, 3), 8);
    const [, sent, offset] = mockNative.updateBuffer.mock.calls[0];
    expect(Array.from(new Float32Array(sent))).toEqual([2, 3]);
    expect(offset).toBe(8);
  });

  it("unimplemented APIs reject with ERR_NOT_IMPLEMENTED on iOS", async () => {
    await expect(MunimMetalkit.createCanvas2D(1, 1)).rejects.toMatchObject({
      code: "ERR_NOT_IMPLEMENTED",
    });
  });
});
