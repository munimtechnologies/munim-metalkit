# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
