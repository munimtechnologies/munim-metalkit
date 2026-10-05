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
  <a aria-label="Package is free to use" href="https://github.com/munimtechnologies/munim-metalkit/blob/main/LICENSE" target="_blank">
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

**munim-metalkit** exposes a small, working slice of Apple's Metal to React Native / Expo apps:
compile Metal Shading Language at runtime, run compute kernels on your own buffers and textures, and
host an `MTKView` you can screenshot.

It is **iOS-only**. Earlier 1.x releases advertised a complete MetalKit API with Android (OpenGL ES)
and web (WebGL) backends; most of that was stubs that returned fake ids. 2.0 removes the pretence:
everything below marked "Works" is implemented and covered by the example app's self-test, and
everything else rejects with a clear `ERR_NOT_IMPLEMENTED` error instead of silently succeeding.

Requires Expo SDK 57 (React Native 0.86, New Architecture) and iOS 16.4+.

Building with Xcode 27: apps built with the iOS 27 SDK must adopt the UIScene lifecycle or they
crash at launch on iOS 27 (Apple TN3187). With Expo SDK 57 that is one config plugin option:
`["expo-build-properties", { "ios": { "enableSceneSupport": true } }]` (expo 57.0.23 or newer).
The module itself does not use `UIScreen.main` or key-window lookups.

## What works

| Area | API | iOS | Android | Web |
| --- | --- | --- | --- | --- |
| Device | `isMetalAvailable`, `getDeviceInfo`, `getMetalCapabilities` | Works | `false` / rejects | `false` / rejects |
| Buffers | `createBuffer`, `createBufferWithData`, `updateBuffer`, `getBufferContents`, `releaseBuffer` | Works (Shared and Private storage) | Rejects | Rejects |
| Textures | `createTexture`, `updateTexture`, `readTexture`, `loadTextureFromURL`, `loadTextureFromData`, `generateMipmaps`, `releaseTexture` | Works (2D / 2D-array, Shared and Private) | Rejects | Rejects |
| Shaders | `createShaderLibrary` (MSL source), `getShaderLibraryFunctionNames`, `releaseShaderLibrary` | Works, compiler errors are reported | Rejects | Rejects |
| Compute | `createComputePipelineState`, `dispatchCompute`, `releaseComputePipelineState` | Works | Rejects | Rejects |
| Render pipelines | `createRenderPipelineState`, `releaseRenderPipelineState` | Builds/validates only; there is no JS draw API yet | Rejects | Rejects |
| View | `<MunimMetalkitView>` props (`preferredFramesPerSecond`, `paused`, `enableSetNeedsDisplay`, `clearColor`, `colorPixelFormat`, `depthStencilPixelFormat`, `sampleCount`, `drawableSize`, `autoResizeDrawable`), events `onLoad`/`onRender`/`onError` | Works; draws the built-in shader (a rotating RGB triangle) | Empty view, `onError` | Empty view, `onError` |
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

```sh
npx expo install munim-metalkit
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

The view renders one built-in shader. Custom render pipelines can be created and validated with
`createRenderPipelineState`, but there is no JavaScript draw API to use them in the view yet.

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

### Compute

- `dispatchCompute(pipelineId, bufferIds, threadgroups, { threadsPerThreadgroup?, textures? })`
  binds `bufferIds[i]` at `[[buffer(i)]]` and `textures[i]` at `[[texture(i)]]`, waits for the GPU,
  and resolves with `{ gpuTimeMs, cpuTimeMs, threadgroups, threadsPerThreadgroup }`.
- `threadsPerThreadgroup` defaults to the pipeline's `threadExecutionWidth`.

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
- The module itself still renders and computes through the classic `MTLCommandQueue`, which keeps
  resources resident automatically, so it does not use `MTKView.residencySet` (iOS 26.4) or MTL4
  command buffers yet.

### Performance

`getPerformanceInfo()` returns the view's average frame interval, the GPU time of the last frame and
of the last compute dispatch, frames rendered, draw calls/triangles of the last frame, the device
name, `recommendedMaxWorkingSetSize`, `currentAllocatedSize`, and live resource counts.

## Example app

`example/` renders the view, runs a self-test on launch (Metal 4 capability report, compute doubling,
buffer/texture round trips including Private storage, error paths, a screenshot, performance info) and logs one line:

```
MUNIM_METALKIT_SELFTEST {"platform":"ios","passed":17,"failed":0,"checks":{...}}
```

```sh
cd example
npm install
npx expo run:ios            # simulator
npx expo run:ios --device   # device (signing team is set in app.json)
npx expo run:android        # checks that every call rejects with ERR_METAL_UNAVAILABLE
```

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

<img alt="Star the Munim Technologies repo on GitHub to support the project" src="https://user-images.githubusercontent.com/9664363/185428788-d762fd5d-97b3-4f59-8db7-f72405be9677.gif" width="50%">
