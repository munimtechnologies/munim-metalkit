<!-- Banner Image -->

<p align="center">
  <a href="https://github.com/munimtechnologies/munim-metalkit">
    <img alt="Munim Technologies MetalKit" height="128" src="./.github/resources/banner.png?v=3">
    <h1 align="center">munim-metalkit</h1>
  </a>
</p>

<p align="center">
   <a aria-label="Package version" href="https://www.npmjs.com/package/munim-metalkit" target="_blank">
    <img alt="Package version" src="https://img.shields.io/npm/v/munim-metalkit.svg?style=flat-square&label=Version&labelColor=000000&color=0066CC" />
  </a>
  <a aria-label="Package is free to use" href="https://github.com/munimtechnologies/munim-metalkit/blob/master/LICENSE" target="_blank">
    <img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache%202.0-success.svg?style=flat-square&color=33CC12" target="_blank" />
  </a>
  <a aria-label="package downloads" href="https://www.npmtrends.com/munim-metalkit" target="_blank">
    <img alt="Downloads" src="https://img.shields.io/npm/dm/munim-metalkit.svg?style=flat-square&labelColor=gray&color=33CC12&label=Downloads" />
  </a>
  <a aria-label="total package downloads" href="https://www.npmjs.com/package/munim-metalkit" target="_blank">
    <img alt="Total Downloads" src="https://img.shields.io/npm/dt/munim-metalkit.svg?style=flat-square&labelColor=gray&color=0066CC&label=Total%20Downloads" />
  </a>
</p>

<p align="center">
  <a aria-label="try with expo" href="https://docs.expo.dev/"><b>Works with Expo</b></a>
&ensp;•&ensp;
  <a aria-label="documentation" href="https://github.com/munimtechnologies/munim-metalkit#readme">Read the Documentation</a>
&ensp;•&ensp;
  <a aria-label="report issues" href="https://github.com/munimtechnologies/munim-metalkit/issues">Report Issues</a>
</p>

<h6 align="center">Follow Munim Technologies</h6>
<p align="center">
  <a aria-label="Follow Munim Technologies on GitHub" href="https://github.com/munimtechnologies" target="_blank">
    <img alt="Munim Technologies on GitHub" src="https://img.shields.io/badge/GitHub-222222?style=for-the-badge&logo=github&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Follow Munim Technologies on LinkedIn" href="https://linkedin.com/in/sheehanmunim" target="_blank">
    <img alt="Munim Technologies on LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Visit Munim Technologies Website" href="https://munimtech.com" target="_blank">
    <img alt="Munim Technologies Website" src="https://img.shields.io/badge/Website-0066CC?style=for-the-badge&logo=globe&logoColor=white" target="_blank" />
  </a>
</p>

## Introduction

**munim-metalkit** exposes a working slice of Apple's Metal to React Native / Expo apps: compile
Metal Shading Language at runtime, run compute kernels on your own buffers and textures, and host an
`MTKView` that draws **your own shaders every display-link frame without calling JavaScript** (with an
optional per-frame compute pass and MetalFX upscaling). Buffers can be mapped into JavaScript with no
copy. It is built on [Nitro Modules](https://nitro.margelo.com)
(a Swift HybridObject and a HybridView), so it works in bare React Native apps and in Expo apps.

It is **iOS-only**. Earlier 1.x releases advertised a complete MetalKit API with Android (OpenGL ES)
and web (WebGL) backends; most of that was stubs that returned fake ids. 2.0 removes the pretence:
everything below marked "Works" is implemented and covered by the example app's self-test, and
everything else rejects with a clear `ERR_NOT_IMPLEMENTED` error instead of silently succeeding.

Requires React Native with the New Architecture, `react-native-nitro-modules` 0.37.2 or newer
(the bindings are generated with nitrogen 0.37.2), and iOS 16.4+. Tested with React Native 0.88.1
(Expo SDK 58). Expo is not required.

Building with Xcode 27: apps built with the iOS 27 SDK must adopt the UIScene lifecycle or they
crash at launch on iOS 27 (Apple TN3187). Expo SDK 58 does this for you; on Expo SDK 57 use
`["expo-build-properties", { "ios": { "enableSceneSupport": true } }]`. The module itself does not
use `UIScreen.main` or key-window lookups.

### Is this the right library?

| | munim-metalkit | [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu) | [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) | [expo-gl](https://docs.expo.dev/versions/latest/sdk/gl-view/) |
| --- | --- | --- | --- | --- |
| API | Metal (MSL source, Metal objects by id) | WebGPU (WGSL) | Skia 2D + SkSL runtime effects | WebGL 1/2 (GLSL ES) |
| Platforms | iOS only | iOS, Android, web | iOS, Android, web | iOS, Android, web |
| Per-frame work | native display link, no JS per frame | JS (or worklet) encodes every frame | Reanimated/worklets drive uniforms | JS issues every GL call |
| GPU compute | yes (+ batches, per-frame view compute) | yes | no | no (WebGL) |
| Metal-only features | MetalFX upscaling, Metal 4 / tensor / mesh-shader capability report | no | no | no |

Pick munim-metalkit when you target Apple platforms and want Metal itself (MSL, Metal-specific
features, no translation layer); pick react-native-wgpu when you need the same GPU code on Android.

## What works

| Area | API | iOS | Android | Web |
| --- | --- | --- | --- | --- |
| Device | `isMetalAvailable`, `getDeviceInfo`, `getMetalCapabilities` | Works | `false` / rejects | `false` / rejects |
| Buffers | `createBuffer`, `createBufferWithData`, `updateBuffer`, `getBufferContents`, `releaseBuffer` | Works (Shared and Private storage) | Rejects | Rejects |
| Textures | `createTexture`, `updateTexture`, `readTexture`, `loadTextureFromURL`, `loadTextureFromData`, `generateMipmaps`, `releaseTexture` | Works (2D / 2D-array, Shared and Private) | Rejects | Rejects |
| Shaders | `createShaderLibrary` (MSL source), `getShaderLibraryFunctionNames`, `releaseShaderLibrary` | Works, compiler errors are reported | Rejects | Rejects |
| Compute | `createComputePipelineState`, `dispatchCompute`, `releaseComputePipelineState` | Works | Rejects | Rejects |
| Compute batches | `dispatchComputeBatch` (many dispatches / `repeatCount`, one submission) | Works | Rejects | Rejects |
| Zero-copy buffers | `mapBuffer` (ArrayBuffer aliasing a Shared `MTLBuffer`) | Works | Throws `ERR_METAL_UNAVAILABLE` | Throws `ERR_METAL_UNAVAILABLE` |
| Render pipelines | `createRenderPipelineState`, `releaseRenderPipelineState` | Works; draw with them through the view's `renderPipelineId` | Rejects | Rejects |
| View | `<MunimMetalkitView>` props (`preferredFramesPerSecond`, `paused`, `enableSetNeedsDisplay`, `clearColor`, `colorPixelFormat`, `depthStencilPixelFormat`, `sampleCount`, `drawableSize`, `autoResizeDrawable`), events `onLoad`/`onRender`/`onError` | Works; draws the built-in shader (a rotating RGB triangle) unless a custom pipeline is set | Empty view, `onError` | Empty view, `onError` |
| Custom rendering in the view | `renderPipelineId`, `vertexCount`, `instanceCount`, `primitiveType`, `computePipelineId`, `computeThreads`, `buffers`, `textures`, `uniformBufferId` | Works: native per-frame compute + draw, triple-buffered uniforms, built-in `MunimFrame` uniforms | Ignored (view reports `ERR_METAL_UNAVAILABLE`) | Ignored |
| Upscaling | view `renderScale` (MetalFX spatial) | Works where MetalFX is supported; elsewhere `onError` `ERR_UNSUPPORTED` and full-size rendering | Ignored | Ignored |
| High refresh rate | `preferredFramesPerSecond={0}` (screen maximum, 120 Hz on ProMotion) | Works | Ignored | Ignored |
| View control | `startRendering`, `stopRendering`, `pauseRendering`, `resumeRendering`, `setNeedsDisplay`, `setPreferredFramesPerSecond`, `setClearColor`, `setDrawableSize` | Works (applies to every mounted view) | Rejects | Rejects |
| Screenshots | `takeScreenshot()` (module or view ref) | Works: real drawable pixels as base64 PNG or a `file://` PNG | Rejects | Rejects |
| Performance | `getPerformanceInfo` | Works: GPU times from `gpuStartTime`/`gpuEndTime`, frame times, device memory | Rejects | Rejects |
| Meshes | `createMesh`, `loadMeshFromURL`, `loadMeshFromData`, `updateMesh`, `releaseMesh` | `ERR_NOT_IMPLEMENTED` | Rejects | Rejects |
| Animations | `createAnimation`, `start/pause/stopAnimation`, `setAnimationTime`, `releaseAnimation` | `ERR_NOT_IMPLEMENTED` | Rejects | Rejects |
| Scene | `setScene`, `updateCamera`, `updateLighting`, view props `scene`/`camera`/`lighting` | `ERR_NOT_IMPLEMENTED` (props ignored with a dev warning) | Rejects | Rejects |
| 2D canvas | `createCanvas2D`, `draw*2D`, layers, styles, export/import (all `*Canvas2D`/layer methods) | `ERR_NOT_IMPLEMENTED` (never had native code) | Rejects | Rejects |

On Android and web every async method rejects with `ERR_METAL_UNAVAILABLE`.

### Error codes

| Code | Meaning |
| --- | --- |
| `ERR_NOT_IMPLEMENTED` | Declared in the types but not implemented. |
| `ERR_METAL_UNAVAILABLE` | No Metal device (Android, web). |
| `ERR_NOT_FOUND` | Unknown or already released resource id. |
| `ERR_INVALID_ARGUMENT` | Bad sizes, empty data, out-of-bounds regions, unknown enum strings. |
| `ERR_UNSUPPORTED` | Valid on some Apple platform but not here (e.g. `Depth24Unorm_Stencil8` on iOS, `Managed` storage). |
| `ERR_SHADER_COMPILATION` | MSL compile failure; the message contains the compiler log. |
| `ERR_GPU` | Metal failed to create an object or a command buffer reported an error. |

## Installation

`react-native-nitro-modules` is a peer dependency; install it next to the package.

React Native:

```sh
npm install munim-metalkit react-native-nitro-modules
cd ios && pod install
```

Expo (no config plugin needed; the module is autolinked during prebuild):

```sh
npx expo install munim-metalkit react-native-nitro-modules
npx expo prebuild   # or use a development build; Expo Go does not include this module
```

Nothing else to configure: the view's shader is compiled at runtime, so no `.metal` files or
`.metallib` need to be added to your app.

## Quick start: double an array on the GPU

```ts
import MunimMetalkit from "munim-metalkit";

const source = `
#include <metal_stdlib>
using namespace metal;
kernel void double_values(device const float *input [[buffer(0)]],
                          device float *output [[buffer(1)]],
                          constant uint &count [[buffer(2)]],
                          uint id [[thread_position_in_grid]]) {
  if (id >= count) { return; }
  output[id] = input[id] * 2.0;
}`;

const input = new Float32Array([1, 2, 3, 4]);
const library = await MunimMetalkit.createShaderLibrary(source);
const pipeline = await MunimMetalkit.createComputePipelineState(library, "double_values");
const inBuf = await MunimMetalkit.createBufferWithData(input);
const outBuf = await MunimMetalkit.createBuffer({ length: input.byteLength });
const countBuf = await MunimMetalkit.createBufferWithData(new Uint32Array([input.length]));

const { gpuTimeMs } = await MunimMetalkit.dispatchCompute(
  pipeline.id,
  [inBuf.id, outBuf.id, countBuf.id], // bound at [[buffer(0)]], [[buffer(1)]], [[buffer(2)]]
  { width: 1 }, // threadgroups
  { threadsPerThreadgroup: { width: 64 } }
);
const output = new Float32Array(await MunimMetalkit.getBufferContents(outBuf.id)); // [2, 4, 6, 8]
```

Binary arguments accept an `ArrayBuffer` or any typed array (SDK 55+ native ArrayBuffer support);
results come back as `ArrayBuffer`s.

## The view

```tsx
import { MunimMetalkitView, type MunimMetalkitViewRef } from "munim-metalkit";

const ref = useRef<MunimMetalkitViewRef>(null);

<MunimMetalkitView
  ref={ref}
  style={{ height: 240 }}
  clearColor={{ red: 0.1, green: 0.1, blue: 0.15, alpha: 1 }}
  onLoad={(e) => console.log("rendering on", e.nativeEvent.deviceName)}
  onRender={(e) => console.log(e.nativeEvent.fps, "fps")} // at most once per second
/>;

const shot = await ref.current?.takeScreenshot(); // { width, height, base64 }
const file = await ref.current?.takeScreenshot({ result: "file" }); // { width, height, uri }
```

`colorPixelFormat` must be a format `CAMetalLayer` can display: `BGRA8Unorm` (default),
`BGRA8Unorm_sRGB`, `RGBA8Unorm`, `RGBA8Unorm_sRGB`, `RGB10A2Unorm` or `RGBA16Float`. Other formats
are rejected through `onError` and the view keeps its current format.

Without `renderPipelineId` the view renders its built-in shader. To draw your own, see below.

## Custom shaders in the view

Give the view a render pipeline (and optionally a compute pipeline) plus the resources to bind. The
view then encodes every frame natively from its display link: compute pass, render pass, present.
JavaScript is not called per frame; animate with the built-in `MunimFrame` uniforms and change values
by writing mapped memory.

```tsx
import MunimMetalkit, {
  FULLSCREEN_TRIANGLE_MSL,
  MUNIM_FRAME_MSL,
  MunimMetalkitView,
} from "munim-metalkit";

const source = `${MUNIM_FRAME_MSL}
${FULLSCREEN_TRIANGLE_MSL}
struct Params { float4 tint; };

kernel void wave(texture2d<float, access::write> out [[texture(0)]],
                 constant MunimFrame &frame [[buffer(30)]],
                 uint2 gid [[thread_position_in_grid]]) {
  if (gid.x >= out.get_width() || gid.y >= out.get_height()) { return; }
  float2 uv = float2(gid) / float2(out.get_width(), out.get_height());
  out.write(float4(0.5 + 0.5 * sin(10.0 * uv.x + frame.time), uv, 1.0), gid);
}

fragment float4 shade(FullscreenOut in [[stage_in]],
                      texture2d<float> wave [[texture(0)]],
                      constant Params &params [[buffer(29)]]) {
  constexpr sampler s(filter::linear);
  return float4(wave.sample(s, in.uv).rgb * params.tint.rgb, 1.0);
}`;

const library = await MunimMetalkit.createShaderLibrary(source);
const render = await MunimMetalkit.createRenderPipelineState({
  libraryId: library,
  vertexFunction: "munim_fullscreen_vertex",
  fragmentFunction: "shade",
  colorAttachments: [{ pixelFormat: "BGRA8Unorm" }], // = the view's colorPixelFormat
});
const compute = await MunimMetalkit.createComputePipelineState(library, "wave");
const texture = await MunimMetalkit.createTexture({
  width: 256, height: 256, pixelFormat: "RGBA8Unorm",
  usage: ["ShaderRead", "ShaderWrite"], storageMode: "Private",
});
const params = await MunimMetalkit.createBufferWithData(new Float32Array([1, 1, 1, 1]));
const tint = new Float32Array(MunimMetalkit.mapBuffer(params.id)); // no copy

<MunimMetalkitView
  style={{ height: 240 }}
  preferredFramesPerSecond={0} // screen maximum (120 Hz on ProMotion)
  renderPipelineId={render.id}
  computePipelineId={compute.id}
  computeThreads={{ width: 256, height: 256 }}
  textures={[texture.id]}
  uniformBufferId={params.id}
  renderScale={0.5} // optional: render at half size, MetalFX-upscale to the drawable
/>;

tint.set([1, 0.6, 0.3, 1]); // the next frame uses it; no native call
```

Binding rules (all stages: vertex, fragment and the per-frame kernel):

| Binding | Index |
| --- | --- |
| `buffers[i]` | `[[buffer(i)]]`, i < 29 |
| `textures[i]` | `[[texture(i)]]`, i < 31 |
| `uniformBufferId` snapshot | `[[buffer(29)]]` (`UNIFORMS_INDEX`) |
| `MunimFrame` (`time`, `deltaTime`, `resolution`, `frameIndex`, `renderScale`; see `MUNIM_FRAME_MSL`) | `[[buffer(30)]]` (`FRAME_UNIFORMS_INDEX`) |

- The view draws `drawPrimitives(primitiveType, 0, vertexCount, instanceCount)` (defaults:
  `"Triangle"`, 3, 1). `FULLSCREEN_TRIANGLE_MSL` declares a vertex function covering the target with
  3 vertices.
- The pipeline must match the view: color attachment 0 = `colorPixelFormat`, `sampleCount` = the
  view's, depth/stencil format unset or equal to `depthStencilPixelFormat`. With a depth format the
  view tests `less` and writes depth; without one the pass has no depth attachment. A mismatch is
  reported once through `onError` (`ERR_INVALID_ARGUMENT`) and the view only clears (Metal would
  otherwise abort on a validation error).
- `computeThreads` defaults to one thread per render-target pixel. Dispatches use non-uniform
  threadgroups (exact grid) on Apple4+ GPUs; still bounds-check in kernels that write textures of a
  different size.
- `uniformBufferId` must be Shared. Up to 4 KB is copied into the command stream each frame; larger
  buffers are copied into a ring of three, so frames in flight (at most three) never see a
  half-written update.
- Bound resources are retained by the view, so releasing an id while it is bound is safe. Unknown
  ids are reported through `onError` (`ERR_NOT_FOUND`) and the view only clears.
- `renderScale` < 1 renders into a smaller texture and upscales it with a MetalFX spatial scaler.
  Where MetalFX is unavailable (Simulator, older GPUs) or with `sampleCount` > 1, `onError` reports
  `ERR_UNSUPPORTED` once and the view renders at full size. `getMetalCapabilities().metalFXSpatial`
  tells you in advance.
- On iPhone, more than 60 fps needs `CADisableMinimumFrameDurationOnPhone` = `true` in Info.plist
  (in Expo: `ios.infoPlist` in app.json). iPad ProMotion displays do not need it.

## API notes

### Textures

- `createTexture({ width, height, pixelFormat, usage?, storageMode?, mipmapLevelCount?, arrayLength?, sampleCount?, depth? })`
  - `storageMode` defaults to `Shared` (Apple GPUs have unified memory). `Private` textures are
    uploaded and read through a blit. Depth and multisample textures are always `Private`.
  - `usage` accepts one value or an array (`ShaderRead`, `ShaderWrite`, `RenderTarget`, `PixelFormatView`).
- `updateTexture(id, data, region?, { bytesPerRow?, mipmapLevel?, slice? })` and
  `readTexture(id, region?, options?)` work on 2D and 2D-array textures with 4/8/16-byte formats
  (`RGBA8Unorm`, `BGRA8Unorm`, `R32Float`, `RGBA16Float`, `RGBA32Float`, ...).
- `loadTextureFromURL(url)` accepts `file://` and `http(s)://` URLs; `loadTextureFromData(bytes)`
  decodes PNG/JPEG/etc. Pass `{ srgb: true }` to decode as sRGB.
- `Depth24Unorm_Stencil8` does not exist on iOS and is rejected; use `Depth32Float_Stencil8`.

### Buffers

- Default storage is `StorageModeShared`; `StorageModePrivate` buffers are written/read via a blit.
- Zero-length data is rejected (Metal cannot create empty buffers); writes are bounds-checked.
- `mapBuffer(id)` returns an `ArrayBuffer` that **is** the Shared buffer's memory (Apple GPUs have
  unified memory): wrap it in a typed array to read GPU results or write inputs without a native call
  or a copy. The mapping keeps the `MTLBuffer` alive until it is garbage-collected. Writes are not
  synchronised with GPU work already running on that buffer: read results after the dispatch
  promise resolves, and use the view's `uniformBufferId` (snapshotted per frame) for per-frame data.
  Private buffers throw `ERR_INVALID_ARGUMENT`.
- `createBufferWithData` and `updateBuffer` copy a Shared buffer's bytes once, straight from the
  JavaScript ArrayBuffer into Metal memory, during the call.

### Compute

- `dispatchCompute(pipelineId, bufferIds, threadgroups, { threadsPerThreadgroup?, textures? })`
  binds `bufferIds[i]` at `[[buffer(i)]]` and `textures[i]` at `[[texture(i)]]`, waits for the GPU,
  and resolves with `{ gpuTimeMs, cpuTimeMs, threadgroups, threadsPerThreadgroup }`.
- `threadsPerThreadgroup` defaults to the pipeline's `threadExecutionWidth`.
- The promise settles from the command buffer's completion handler; no thread waits on the GPU.
- `dispatchComputeBatch(steps)` encodes many dispatches into one command buffer and resolves once
  with `{ gpuTimeMs, cpuTimeMs, dispatchCount }`. Steps run in order (later steps see earlier
  writes). Each step takes `pipelineId`, `buffers`, `textures`, exactly one of `threadgroups` or
  `threads` (an exact grid, non-uniform threadgroups), optional `threadsPerThreadgroup` and
  `repeatCount` (e.g. 100 simulation iterations in one call):

```ts
await MunimMetalkit.dispatchComputeBatch([
  { pipelineId: integrate.id, buffers: [particles.id], threads: { width: 10_000 }, repeatCount: 8 },
  { pipelineId: bin.id, buffers: [particles.id, grid.id], threads: { width: 10_000 } },
]);
```

### Metal 4 capabilities

`getMetalCapabilities()` tells you what the device and OS support beyond the classic Metal API,
without throwing for missing features:

```ts
const caps = await MunimMetalkit.getMetalCapabilities();
// { osVersion: "27.0", compiledWithMetal4SDK: true, appleGPUFamily: 9, metal3: true, metal4: true,
//   mtl4CommandQueue: true, mtl4Compiler: true, tensors: true, residencySets: true, raytracing: true }
if (!caps.metal4) console.log(caps.unsupportedReason);
```

- `metal4` is `supportsFamily(.metal4)`: iOS 26+ on Apple A14 / M1 or newer. `mtl4CommandQueue`,
  `mtl4Compiler` and `tensors` are only probed when it is true, by actually creating an
  `MTL4CommandQueue`, an `MTL4Compiler` and a 4-element `MTLTensor` (once per process).
- `compiledWithMetal4SDK` is false when the app was built with an Xcode older than 26, and always
  false in the Simulator, whose SDK has no Metal 4 symbols. The probes are compiled behind
  `#if compiler(>=6.2)`, so the module still builds with Xcode 16.
- `residencySets` reports `MTLDevice.makeResidencySet` (iOS 18+). `appleGPUFamily` is the highest
  `MTLGPUFamily.appleN`; `getDeviceInfo().gpuFamilies` now also lists `apple10`/`apple11` on GPUs
  that have them.
- `metalFXSpatial`, `metalFXTemporal` and `metalFXFrameInterpolation` (iOS 26+) report MetalFX
  support; `meshShaders` (Apple7+) and `nonUniformThreadgroups` (Apple4+) report GPU family features.
- The module itself still renders and computes through the classic `MTLCommandQueue`, which keeps
  resources resident automatically, so it does not use `MTKView.residencySet` (iOS 26.4) or MTL4
  command buffers yet.

### Performance

`getPerformanceInfo()` returns the view's average frame interval, the GPU time of the last frame and
of the last compute dispatch, frames rendered, draw calls/triangles of the last frame, the device
name, `recommendedMaxWorkingSetSize`, `currentAllocatedSize`, and live resource counts.

## Example app

`example/` renders the built-in view and a GPU-driven custom-shader view (per-frame compute into a
texture, tint buttons that write mapped memory, a MetalFX 50% toggle), runs a self-test on launch
(capability report, compute doubling, compute batches, `mapBuffer` aliasing, buffer/texture round
trips including Private storage, error paths, the custom view's per-frame compute and uniforms,
screenshots, performance info) and logs one line:

```
MUNIM_METALKIT_SELFTEST {"platform":"ios","passed":23,"failed":0,"checks":{...}}
```

"Run benchmark" times 4 MB uploads (`updateBuffer` Shared/Private, `mapBuffer`), 4 MB readbacks
and 200 awaited `dispatchCompute` calls against one `dispatchComputeBatch`, and logs
`MUNIM_METALKIT_BENCH {...}` (also written to `Documents/munim-metalkit-bench.json`).

The example is an npm workspace of the repository and uses the package from the repository root:

```sh
npm install                 # at the repository root
cd example
npx expo run:ios            # simulator
npx expo run:ios --device   # device (signing team is set in app.json)
npx expo run:android        # checks that every call rejects with ERR_METAL_UNAVAILABLE (6 checks)
```

## Upgrading from 2.x

3.x moves the native code from an Expo module (`expo-modules-core`) to Nitro Modules. The
JavaScript API is unchanged: the same exports, types, methods, props, events and error codes.

- Install the peer dependency `react-native-nitro-modules` (see [Installation](#installation)).
  `expo` is no longer a peer dependency; Expo apps keep working through prebuild autolinking.
- Rebuild the native app (`pod install` / `npx expo prebuild`).
- The default export is no longer an Expo `NativeModule` instance. It never emitted events; its
  `addListener`/`removeListener`/`removeAllListeners`/`emit`/`listenerCount` remain as no-ops.
- A `MunimMetalkitView` ref exposes `takeScreenshot()` and `renderFrame()` (the documented
  `MunimMetalkitViewRef`). On Android these now exist and reject with `ERR_METAL_UNAVAILABLE`.

## Migrating from 1.x

- `createComputePipelineState(functionName)` is now `createComputePipelineState(libraryId, functionName)`
  and resolves with an object (`{ id, threadExecutionWidth, ... }`) instead of a random id.
- `createRenderPipelineState` requires `libraryId` and `vertexFunction`.
- `takeScreenshot()` resolves with `{ width, height, base64 | uri }` instead of an empty array.
- Buffers and textures default to Shared storage (1.x defaulted to Private and then crashed on CPU access).
- Mesh, animation, scene and 2D canvas methods reject with `ERR_NOT_IMPLEMENTED` instead of returning fake ids.
- The `hello()`/`setValueAsync()` template leftovers and the module-level events were removed.
- Android and web no longer pretend to implement Metal.

## 👏 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<a href="https://github.com/munimtechnologies/munim-metalkit">
  <img alt="Enjoying Munim Technologies? Star the repo on GitHub" src="./.github/resources/star-repo.svg" width="50%">
</a>
