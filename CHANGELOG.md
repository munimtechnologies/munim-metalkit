# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - Unreleased

Honesty release: the 1.x API surface was mostly stubs. Everything that remains "working" is now
real and covered by the example app's self-test; everything else rejects loudly.

### Breaking

- Requires Expo SDK 57 (React Native 0.86, New Architecture only) and iOS/tvOS 16.4+.
- `createComputePipelineState(functionName)` is now `createComputePipelineState(libraryId, functionName)`
  and resolves with `{ id, functionName, threadExecutionWidth, maxTotalThreadsPerThreadgroup }`.
- `createRenderPipelineState` requires `libraryId` and `vertexFunction`.
- `takeScreenshot()` resolves with `{ width, height, base64 | uri }`.
- Buffers and textures default to Shared storage.
- Mesh, animation, scene/camera/lighting and the whole 2D canvas API reject with
  `ERR_NOT_IMPLEMENTED` instead of resolving with random ids; marked `@experimental`/`@deprecated`.
- Android and web: `isMetalAvailable()` is `false` and every async method rejects with
  `ERR_METAL_UNAVAILABLE` (the OpenGL ES / WebGL shims were removed).
- Removed the template leftovers `hello()`, `setValueAsync()` and the never-emitted module events.

### Added

- `createShaderLibrary` keeps the compiled `MTLLibrary`; compiler errors surface the compiler log
  (`ERR_SHADER_COMPILATION`). `getShaderLibraryFunctionNames`, `releaseShaderLibrary`.
- `dispatchCompute(pipelineId, bufferIds, threadgroups, options?)` runs a kernel and reports GPU time.
- `readTexture`, `releaseComputePipelineState`, `R32Float` pixel format, `paused` view prop,
  view-ref methods `takeScreenshot()` / `renderFrame()`.
- `getPerformanceInfo` reports real data: GPU times from `gpuStartTime`/`gpuEndTime`, frame
  intervals, device name, `recommendedMaxWorkingSetSize`, `currentAllocatedSize`, resource counts.
- Binary arguments use native ArrayBuffer support (any `ArrayBuffer` or typed array), results are
  `ArrayBuffer`s.
- Example app: compute doubling, texture round trip and MTKView screenshot demo with an automatic
  self-test that logs `MUNIM_METALKIT_SELFTEST {json}`.

### Fixed

- `updateBuffer`/`getBufferContents`/`updateTexture` on Private resources (now via blit) instead
  of touching `contents()` / `replace(region:)` on GPU-only memory.
- Crash (`baseAddress!`) on empty data; writes and regions are bounds-checked.
- `createRenderPipelineState` never set a vertex function.
- `Depth24Unorm_Stencil8` was silently mapped to `Depth32Float_Stencil8`; it is now rejected on iOS.
- Resource dictionaries were mutated from concurrent async calls without a lock.
- The view called `makeDefaultLibrary()` without shipping any shader; it now compiles a built-in
  shader from source and actually draws.
- `SCNRenderer.render(atTime:)` was called outside any render pass (drew nothing); SceneKit removed.
- View props were stored but never applied to the `MTKView`.
- Swift 6 language mode with data-race checking.

## [0.1.0] - 2024-01-XX

### Added

- Initial release of Munim MetalKit React Native package
- Complete MetalKit API coverage for iOS, Android, and Web platforms
- Texture management with full pixel format support
- Buffer management for vertices, indices, and uniforms
- Shader compilation and management system
- 3D mesh loading and rendering capabilities
- Animation system with timing functions
- Scene management with cameras, lighting, and materials
- Cross-platform rendering support:
  - iOS: Native MetalKit implementation
  - Android: OpenGL ES implementation
  - Web: WebGL fallback
- Performance monitoring and optimization tools
- Comprehensive TypeScript type definitions
- Example application showcasing all features
- Full documentation and API reference

### Features

- **Device Information**: Check Metal/OpenGL availability and get device capabilities
- **Texture Management**: Create, load, update, and manage textures
- **Buffer Management**: Handle vertex, index, and uniform buffers
- **Shader Support**: Compile and manage vertex, fragment, and compute shaders
- **Mesh Rendering**: Load and render 3D meshes in multiple formats
- **Animation System**: Create and control complex animations
- **Scene Management**: Full 3D scene support with cameras and lighting
- **Rendering Control**: Start, stop, pause, and resume rendering
- **Utility Functions**: Screenshot capture and performance monitoring
- **Event System**: Real-time events for rendering, errors, and animations

### Supported Formats

- **Pixel Formats**: RGBA8Unorm, BGRA8Unorm, RGB10A2Unorm, RG11B10Float, RGB9E5Float, RGBA16Float, RGBA32Float, Depth32Float, Depth24Unorm_Stencil8, Depth32Float_Stencil8
- **Primitive Types**: Point, Line, LineStrip, Triangle, TriangleStrip
- **Mesh Formats**: OBJ, PLY, STL (planned)
- **Animation Timing**: Linear, EaseIn, EaseOut, EaseInEaseOut, Default

### Platform Support

- **iOS**: 15.1+ with Metal support
- **Android**: API 21+ with OpenGL ES 2.0+
- **Web**: Modern browsers with WebGL support

### Dependencies

- React Native 0.81.4+
- Expo SDK 54+
- TypeScript 5.9+

### Breaking Changes

- None (initial release)

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- Secure texture loading from URLs
- Safe buffer management
- Proper resource cleanup
