import {
  call,
  callSync,
  makeError,
  toArrayBuffer,
  toMunimMetalkitError,
  toScreenshot,
} from "../src/internal";

describe("error codes", () => {
  it("turns a `[ERR_...]` prefix into error.code", () => {
    const error = toMunimMetalkitError(
      new Error("[ERR_NOT_FOUND] No buffer with id 'x'."),
    ) as Error & { code: string };
    expect(error.code).toBe("ERR_NOT_FOUND");
    expect(error.message).toBe("No buffer with id 'x'.");
    expect(error.name).toBe("MunimMetalkitError");
  });

  it("finds the code after a JSI prefix and keeps multi-line compiler logs", () => {
    const error = toMunimMetalkitError(
      new Error(
        "MunimMetalkit.createShaderLibrary(...): [ERR_SHADER_COMPILATION] Metal shader compilation failed:\nline 1",
      ),
    ) as Error & { code: string };
    expect(error.code).toBe("ERR_SHADER_COMPILATION");
    expect(error.message).toBe("Metal shader compilation failed:\nline 1");
  });

  it("passes other errors through unchanged", () => {
    const original = new TypeError("Value is undefined, expected a string");
    expect(toMunimMetalkitError(original)).toBe(original);
  });

  it("call() turns synchronous native throws into coded rejections", async () => {
    await expect(
      call(() => {
        throw new Error(
          "[ERR_INVALID_ARGUMENT] fps must be an integer, got 1.5.",
        );
      }),
    ).rejects.toMatchObject({ code: "ERR_INVALID_ARGUMENT" });
    await expect(call(async () => 42)).resolves.toBe(42);
  });

  it("callSync() maps synchronous native throws", () => {
    expect(() =>
      callSync(() => {
        throw new Error("[ERR_METAL_UNAVAILABLE] mapBuffer() is unavailable.");
      }),
    ).toThrow(expect.objectContaining({ code: "ERR_METAL_UNAVAILABLE" }));
    expect(callSync(() => "ok")).toBe("ok");
  });

  it("makeError builds a coded error", () => {
    expect(makeError("ERR_GPU", "boom")).toMatchObject({
      code: "ERR_GPU",
      message: "boom",
    });
  });
});

describe("toArrayBuffer", () => {
  it("passes ArrayBuffers and whole-buffer views without copying", () => {
    const buffer = new ArrayBuffer(16);
    expect(toArrayBuffer(buffer)).toBe(buffer);
    const floats = new Float32Array(buffer);
    expect(toArrayBuffer(floats)).toBe(buffer);
  });

  it("copies exactly the viewed bytes of a sub-view", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const view = new Uint8Array(bytes.buffer, 2, 3);
    const result = toArrayBuffer(view);
    expect(result).not.toBe(bytes.buffer);
    expect(Array.from(new Uint8Array(result))).toEqual([2, 3, 4]);
  });

  it("rejects non-binary input with ERR_INVALID_ARGUMENT", () => {
    expect(() => toArrayBuffer([1, 2, 3] as unknown as ArrayBuffer)).toThrow(
      expect.objectContaining({ code: "ERR_INVALID_ARGUMENT" }),
    );
  });
});

describe("toScreenshot", () => {
  it("only includes the key that applies", () => {
    expect(toScreenshot({ width: 2, height: 3, base64: "abc" })).toEqual({
      width: 2,
      height: 3,
      base64: "abc",
    });
    expect(toScreenshot({ width: 2, height: 3, uri: "file:///x.png" })).toEqual(
      { width: 2, height: 3, uri: "file:///x.png" },
    );
  });
});
