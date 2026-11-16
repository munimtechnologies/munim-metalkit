import { toNativeViewProps, VIEW_PROP_NAMES } from "../src/viewProps";

describe("toNativeViewProps", () => {
  it("converts structured props to arrays with defaults", () => {
    const native = toNativeViewProps({
      drawableSize: { width: 640, height: 480 },
      clearColor: { red: 0.5, green: 0.25, blue: 0.125, alpha: 1 },
      computeThreads: { width: 1024 },
    });
    expect(native.drawableSize).toEqual([640, 480]);
    expect(native.clearColor).toEqual([0.5, 0.25, 0.125, 1]);
    expect(native.computeThreads).toEqual([1024, 1, 1]);
  });

  it("forwards the custom-rendering props unchanged", () => {
    const native = toNativeViewProps({
      renderPipelineId: "render",
      computePipelineId: "compute",
      buffers: ["a", "b"],
      textures: ["t"],
      uniformBufferId: "u",
      vertexCount: 6,
      instanceCount: 100,
      primitiveType: "TriangleStrip",
      renderScale: 0.5,
      preferredFramesPerSecond: 0,
    });
    expect(native).toMatchObject({
      renderPipelineId: "render",
      computePipelineId: "compute",
      buffers: ["a", "b"],
      textures: ["t"],
      uniformBufferId: "u",
      vertexCount: 6,
      instanceCount: 100,
      primitiveType: "TriangleStrip",
      renderScale: 0.5,
      preferredFramesPerSecond: 0,
    });
  });

  it("leaves unset props undefined so native code restores defaults", () => {
    const native = toNativeViewProps({});
    for (const value of Object.values(native)) {
      expect(value).toBeUndefined();
    }
  });

  it("drops the unimplemented 1.x props", () => {
    const native = toNativeViewProps({
      scene: {} as never,
      camera: {} as never,
      lighting: {} as never,
    }) as Record<string, unknown>;
    expect(native.scene).toBeUndefined();
    expect(native.camera).toBeUndefined();
    expect(native.lighting).toBeUndefined();
  });

  it("lists every converted prop in VIEW_PROP_NAMES", () => {
    expect(new Set(Object.keys(toNativeViewProps({})))).toEqual(
      new Set(VIEW_PROP_NAMES),
    );
  });
});
