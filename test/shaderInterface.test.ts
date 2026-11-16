import {
  FRAME_UNIFORMS_BYTE_LENGTH,
  FRAME_UNIFORMS_INDEX,
  MUNIM_FRAME_MSL,
  UNIFORMS_INDEX,
} from "../src/shaderInterface";

// MSL sizes and alignments of the types MunimFrame uses.
const LAYOUT: Record<string, { size: number; align: number }> = {
  float: { size: 4, align: 4 },
  uint: { size: 4, align: 4 },
  float2: { size: 8, align: 8 },
};

describe("MunimFrame", () => {
  it("matches the 24-byte layout the native side binds at buffer(30)", () => {
    const body = /struct MunimFrame \{([\s\S]*?)\};/.exec(MUNIM_FRAME_MSL)![1]!;
    const fields = [...body.matchAll(/^\s*(\w+) (\w+);/gm)].map((m) => ({
      type: m[1]!,
      name: m[2]!,
    }));
    expect(fields.map((f) => f.name)).toEqual([
      "time",
      "deltaTime",
      "resolution",
      "frameIndex",
      "renderScale",
    ]);
    let offset = 0;
    let maxAlign = 1;
    for (const { type } of fields) {
      const { size, align } = LAYOUT[type]!;
      offset = Math.ceil(offset / align) * align + size;
      maxAlign = Math.max(maxAlign, align);
    }
    expect(Math.ceil(offset / maxAlign) * maxAlign).toBe(
      FRAME_UNIFORMS_BYTE_LENGTH,
    );
  });

  it("uses the reserved buffer indices", () => {
    expect(FRAME_UNIFORMS_INDEX).toBe(30);
    expect(UNIFORMS_INDEX).toBe(29);
  });
});
