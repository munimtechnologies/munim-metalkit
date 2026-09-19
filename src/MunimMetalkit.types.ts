import type { Ref } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Binary input accepted by the native module. Typed arrays (e.g. `Float32Array`) are passed
 * without re-packing; their `byteOffset`/`byteLength` are respected.
 */
export type BinaryData = ArrayBuffer | ArrayBufferView;

/**
 * Error codes used by rejected promises.
 * - `ERR_NOT_IMPLEMENTED`: the API exists in the types but has no native implementation.
 * - `ERR_METAL_UNAVAILABLE`: no Metal device (Android, web, or an unsupported simulator).
 */
export type MunimMetalkitErrorCode =
  | "ERR_NOT_IMPLEMENTED"
  | "ERR_METAL_UNAVAILABLE"
  | "ERR_NOT_FOUND"
  | "ERR_INVALID_ARGUMENT"
  | "ERR_UNSUPPORTED"
  | "ERR_SHADER_COMPILATION"
  | "ERR_GPU";

// Core MetalKit Types
export type MTLPixelFormat =
  | "RGBA8Unorm"
  | "RGBA8Unorm_sRGB"
  | "BGRA8Unorm"
  | "BGRA8Unorm_sRGB"
  | "RGB10A2Unorm"
  | "RG11B10Float"
  | "RGB9E5Float"
  | "RGBA16Float"
  | "RGBA32Float"
  | "R32Float"
  | "Depth32Float"
  /** Not available on iOS/tvOS; rejected with `ERR_UNSUPPORTED`. Use `Depth32Float_Stencil8`. */
  | "Depth24Unorm_Stencil8"
  | "Depth32Float_Stencil8"
  /** Disables the attachment (e.g. no depth buffer for the view). */
  | "Invalid";

export type MTLPrimitiveType =
  "Point" | "Line" | "LineStrip" | "Triangle" | "TriangleStrip";

export type MTLWinding = "Clockwise" | "CounterClockwise";

export type MTLCullMode = "None" | "Front" | "Back";

export type MTLFillMode = "Fill" | "Lines";

export type MTLBlendOperation =
  "Add" | "Subtract" | "ReverseSubtract" | "Min" | "Max";

export type MTLBlendFactor =
  | "Zero"
  | "One"
  | "SourceColor"
  | "OneMinusSourceColor"
  | "SourceAlpha"
  | "OneMinusSourceAlpha"
  | "DestinationColor"
  | "OneMinusDestinationColor"
  | "DestinationAlpha"
  | "OneMinusDestinationAlpha"
  | "BlendColor"
  | "OneMinusBlendColor"
  | "BlendAlpha"
  | "OneMinusBlendAlpha"
  | "SourceAlphaSaturated"
  | "Source1Color"
  | "OneMinusSource1Color"
  | "Source1Alpha"
  | "OneMinusSource1Alpha";

// Device

export type DeviceInfo = {
  name: string;
  /** Same as `maxThreadsPerThreadgroup.width` (kept for 1.x compatibility). */
  maxThreadsPerGroup: number;
  maxThreadsPerThreadgroup: { width: number; height: number; depth: number };
  maxThreadgroupMemoryLength: number;
  maxBufferLength: number;
  recommendedMaxWorkingSetSize: number;
  hasUnifiedMemory: boolean;
  /** Supported Apple GPU families, e.g. `["apple4", ..., "apple9"]`. */
  gpuFamilies: string[];
};

// Texture Types

export type TextureUsage =
  "ShaderRead" | "ShaderWrite" | "RenderTarget" | "PixelFormatView";

export type TextureDescriptor = {
  width: number;
  height: number;
  pixelFormat: MTLPixelFormat;
  /** One usage or a list of usages. Defaults to `ShaderRead`. */
  usage?: TextureUsage | TextureUsage[];
  mipmapLevelCount?: number;
  sampleCount?: number;
  arrayLength?: number;
  depth?: number;
  /**
   * Defaults to `Shared` (CPU-visible; Apple GPUs have unified memory). `Private` textures are
   * uploaded/read through a blit. Depth and multisample textures are always `Private`.
   * `Managed` is macOS-only and rejected on iOS.
   */
  storageMode?: "Shared" | "Private" | "Managed";
};

export type Texture = {
  id: string;
  width: number;
  height: number;
  pixelFormat: MTLPixelFormat;
  mipmapLevelCount: number;
  sampleCount: number;
  arrayLength: number;
  depth: number;
  storageMode: "Shared" | "Private";
};

export type TextureLoadOptions = {
  /** Decode as sRGB. Defaults to false so texel values match the file bytes. */
  srgb?: boolean;
  storageMode?: "Shared" | "Private";
  generateMipmaps?: boolean;
};

/** A 2D region. `width`/`height` default to the rest of the mip level. */
export type TextureRegion = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type TextureTransferOptions = {
  /** Row pitch of the data. Defaults to tightly packed (`width * bytesPerPixel`). */
  bytesPerRow?: number;
  mipmapLevel?: number;
  slice?: number;
};

// Buffer Types
export type BufferDescriptor = {
  length: number;
  /**
   * Defaults to `StorageModeShared`. `StorageModePrivate` buffers are read and written through a
   * blit. `StorageModeManaged` is macOS-only and rejected on iOS.
   */
  options?:
    | "CPUCacheModeDefaultCache"
    | "CPUCacheModeWriteCombined"
    | "StorageModeShared"
    | "StorageModeManaged"
    | "StorageModePrivate";
};

export type Buffer = {
  id: string;
  length: number;
  storageMode: "Shared" | "Private";
};

// Compute

export type ThreadSize = {
  width: number;
  height?: number;
  depth?: number;
};

export type ComputePipelineState = {
  id: string;
  functionName: string;
  threadExecutionWidth: number;
  maxTotalThreadsPerThreadgroup: number;
};

export type DispatchComputeOptions = {
  /** Defaults to `{ width: threadExecutionWidth }`. */
  threadsPerThreadgroup?: ThreadSize;
  /** Texture ids bound at `[[texture(0)]]`, `[[texture(1)]]`, ... */
  textures?: string[];
};

export type ComputeDispatchResult = {
  /** GPU execution time from the command buffer's `gpuStartTime`/`gpuEndTime`. */
  gpuTimeMs: number | null;
  /** Wall-clock time from commit to completion. */
  cpuTimeMs: number;
  threadgroups: { width: number; height: number; depth: number };
  threadsPerThreadgroup: { width: number; height: number; depth: number };
};

// Shader Types
export type ShaderDescriptor = {
  /** Id returned by `createShaderLibrary`. Required. */
  libraryId: string;
  /** Required. */
  vertexFunction: string;
  fragmentFunction?: string;
  /** @deprecated Ignored. Use `createComputePipelineState(libraryId, functionName)`. */
  computeFunction?: string;
  /** @deprecated Not implemented; ignored. Use `[[vertex_id]]`-driven vertex shaders. */
  vertexDescriptor?: VertexDescriptor;
  colorAttachments?: Partial<ColorAttachmentDescriptor>[];
  depthAttachmentPixelFormat?: MTLPixelFormat;
  stencilAttachmentPixelFormat?: MTLPixelFormat;
  sampleCount?: number;
  /** @deprecated Ignored; `sampleCount` sets the raster sample count. */
  rasterSampleCount?: number;
  alphaToCoverageEnabled?: boolean;
  alphaToOneEnabled?: boolean;
  rasterizationEnabled?: boolean;
  /** @deprecated Not implemented; ignored. */
  inputPrimitiveTopology?: "Unspecified" | "Point" | "Line" | "Triangle";
  /** @deprecated Not implemented; ignored. */
  tessellationPartitionMode?:
    "Pow2" | "Integer" | "FractionalOdd" | "FractionalEven";
  /** @deprecated Not implemented; ignored. */
  maxTessellationFactor?: number;
  /** @deprecated Not implemented; ignored. */
  tessellationFactorScaleEnabled?: boolean;
  /** @deprecated Not implemented; ignored. */
  tessellationFactorFormat?: "Half" | "Float";
  /** @deprecated Not implemented; ignored. */
  tessellationControlPointIndexType?: "None" | "UInt16" | "UInt32";
  /** @deprecated Not implemented; ignored. */
  tessellationFactorStepFunction?:
    | "Constant"
    | "PerPatch"
    | "PerPatchAndPerInstance"
    | "PerInstance"
    | "PerPatchAndPerInstance";
  /** @deprecated Not implemented; ignored. */
  tessellationOutputWindingOrder?: MTLWinding;
};

export type VertexDescriptor = {
  layouts: VertexBufferLayoutDescriptor[];
  attributes: VertexAttributeDescriptor[];
};

export type VertexBufferLayoutDescriptor = {
  stride: number;
  stepFunction: "Constant" | "PerVertex" | "PerInstance";
  stepRate: number;
};

export type VertexAttributeDescriptor = {
  format:
    | "Invalid"
    | "UChar2"
    | "UChar3"
    | "UChar4"
    | "Char2"
    | "Char3"
    | "Char4"
    | "UChar2Normalized"
    | "UChar3Normalized"
    | "UChar4Normalized"
    | "Char2Normalized"
    | "Char3Normalized"
    | "Char4Normalized"
    | "UShort2"
    | "UShort3"
    | "UShort4"
    | "Short2"
    | "Short3"
    | "Short4"
    | "UShort2Normalized"
    | "UShort3Normalized"
    | "UShort4Normalized"
    | "Short2Normalized"
    | "Short3Normalized"
    | "Short4Normalized"
    | "Half2"
    | "Half3"
    | "Half4"
    | "Float"
    | "Float2"
    | "Float3"
    | "Float4"
    | "Int"
    | "Int2"
    | "Int3"
    | "Int4"
    | "UInt"
    | "UInt2"
    | "UInt3"
    | "UInt4"
    | "Int1010102Normalized"
    | "UInt1010102Normalized";
  offset: number;
  bufferIndex: number;
};

export type ColorAttachmentDescriptor = {
  pixelFormat: MTLPixelFormat;
  isBlendingEnabled: boolean;
  rgbBlendOperation: MTLBlendOperation;
  alphaBlendOperation: MTLBlendOperation;
  sourceRGBBlendFactor: MTLBlendFactor;
  sourceAlphaBlendFactor: MTLBlendFactor;
  destinationRGBBlendFactor: MTLBlendFactor;
  destinationAlphaBlendFactor: MTLBlendFactor;
  /** @deprecated Not implemented; ignored (all channels are written). */
  writeMask?: "None" | "Red" | "Green" | "Blue" | "Alpha" | "All";
};

// Render Pipeline Types
export type RenderPipelineState = {
  id: string;
  vertexFunction: string;
  fragmentFunction: string;
  colorAttachments: {
    pixelFormat: MTLPixelFormat;
    isBlendingEnabled: boolean;
  }[];
  sampleCount: number;
  rasterSampleCount: number;
  alphaToCoverageEnabled: boolean;
  alphaToOneEnabled: boolean;
  rasterizationEnabled: boolean;
};

/** @deprecated Not used by any implemented API. */
export type RenderPassDescriptor = {
  colorAttachments: ColorAttachmentDescriptor[];
  depthAttachment?: DepthStencilAttachmentDescriptor;
  stencilAttachment?: DepthStencilAttachmentDescriptor;
  visibilityResultBuffer?: Buffer;
  renderTargetArrayLength: number;
  renderTargetWidth: number;
  renderTargetHeight: number;
  defaultRasterSampleCount: number;
  rasterSampleCount: number;
  imageblockSampleLength: number;
  threadgroupMemoryLength: number;
  tileWidth: number;
  tileHeight: number;
};

/** @deprecated Not used by any implemented API. */
export type DepthStencilAttachmentDescriptor = {
  texture: Texture;
  level: number;
  slice: number;
  depthPlane: number;
  loadAction: "DontCare" | "Load" | "Clear";
  storeAction:
    | "DontCare"
    | "Store"
    | "MultisampleResolve"
    | "StoreAndMultisampleResolve"
    | "Unknown"
    | "CustomSampleDepthStore";
  clearDepth: number;
  clearStencil: number;
};

// Screenshots and performance

export type ScreenshotOptions = {
  /** `base64` (default) returns a base64 PNG; `file` writes a PNG to the caches directory. */
  result?: "base64" | "file";
};

export type Screenshot = {
  width: number;
  height: number;
  /** Base64-encoded PNG (when `result` is `base64`). */
  base64?: string;
  /** `file://` URI of the PNG (when `result` is `file`). */
  uri?: string;
};

export type PerformanceInfo = {
  /** Average CPU frame interval of the view over the last 60 frames, in ms (0 before any frame). */
  frameTime: number;
  fps: number;
  /** GPU time of the most recent view frame, in ms. */
  gpuFrameTime: number | null;
  /** GPU time of the most recent `dispatchCompute`, in ms. */
  lastComputeGpuTime: number | null;
  framesRendered: number;
  /** Draw calls in the most recent view frame. */
  drawCallCount: number;
  /** Triangles in the most recent view frame. */
  triangleCount: number;
  deviceName?: string;
  recommendedMaxWorkingSetSize?: number;
  currentAllocatedSize?: number;
  resourceCounts: {
    textures: number;
    buffers: number;
    shaderLibraries: number;
    computePipelines: number;
    renderPipelines: number;
  };
};

// Mesh Types (not implemented)

/** @experimental Not implemented: mesh APIs reject with `ERR_NOT_IMPLEMENTED`. */
export type MeshDescriptor = {
  vertexBuffers: Buffer[];
  vertexCount: number;
  primitiveType: MTLPrimitiveType;
  indexBuffer?: Buffer;
  indexCount?: number;
  indexType?: "UInt16" | "UInt32";
};

/** @experimental Not implemented. */
export type Mesh = {
  id: string;
  vertexBuffers: Buffer[];
  vertexCount: number;
  primitiveType: MTLPrimitiveType;
  indexBuffer?: Buffer;
  indexCount?: number;
  indexType?: "UInt16" | "UInt32";
  submeshes: Submesh[];
};

/** @experimental Not implemented. */
export type Submesh = {
  indexBuffer: Buffer;
  indexCount: number;
  indexType: "UInt16" | "UInt32";
  primitiveType: MTLPrimitiveType;
  geometryType: "TypePoint" | "TypeLine" | "TypeTriangle" | "TypeTriangleStrip";
  materialIndex: number;
};

// Animation Types (not implemented)

/** @experimental Not implemented: animation APIs reject with `ERR_NOT_IMPLEMENTED`. */
export type AnimationDescriptor = {
  duration: number;
  repeatCount?: number;
  autoreverses?: boolean;
  timingFunction?:
    "Linear" | "EaseIn" | "EaseOut" | "EaseInEaseOut" | "Default";
};

/** @experimental Not implemented. */
export type Animation = {
  id: string;
  duration: number;
  repeatCount: number;
  autoreverses: boolean;
  timingFunction: string;
  isRunning: boolean;
  currentTime: number;
};

// Event Types

export type OnLoadEventPayload = {
  /** Name of the Metal device, emitted after the first frame is encoded. */
  deviceName: string;
};

/** Emitted at most once per second while the view renders. */
export type OnRenderEventPayload = Pick<
  PerformanceInfo,
  | "frameTime"
  | "fps"
  | "gpuFrameTime"
  | "lastComputeGpuTime"
  | "framesRendered"
  | "drawCallCount"
  | "triangleCount"
>;

export type OnErrorEventPayload = {
  error: string;
  code: string;
};

/** @deprecated Never emitted (animations are not implemented). */
export type OnAnimationCompleteEventPayload = {
  animationId: string;
  completed: boolean;
};

/** The module emits no events; view events are delivered through `MunimMetalkitView` props. */
export type MunimMetalkitModuleEvents = Record<never, never>;

/** Imperative methods available on a `MunimMetalkitView` ref (iOS). */
export type MunimMetalkitViewRef = {
  /** Renders a frame and returns its pixels as a PNG. */
  takeScreenshot(options?: ScreenshotOptions): Promise<Screenshot>;
  /** Renders one frame now (works while `paused`). */
  renderFrame(): Promise<void>;
};

// View Props
export type MunimMetalkitViewProps = {
  ref?: Ref<MunimMetalkitViewRef>;
  style?: StyleProp<ViewStyle>;

  // Rendering props (applied to the underlying MTKView)
  preferredFramesPerSecond?: number;
  /** When true the view only redraws on demand (MTKView semantics). Defaults to false. */
  enableSetNeedsDisplay?: boolean;
  /** Pauses the render loop. Defaults to false. */
  paused?: boolean;
  autoResizeDrawable?: boolean;
  /** Fixed drawable size in pixels. Disables auto-resizing while set. */
  drawableSize?: { width: number; height: number };
  colorPixelFormat?: MTLPixelFormat;
  depthStencilPixelFormat?: MTLPixelFormat;
  sampleCount?: number;
  clearColor?: { red: number; green: number; blue: number; alpha: number };

  // Event handlers
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
  onRender?: (event: { nativeEvent: OnRenderEventPayload }) => void;
  onError?: (event: { nativeEvent: OnErrorEventPayload }) => void;
  /** @deprecated Never called (animations are not implemented). */
  onAnimationComplete?: (event: {
    nativeEvent: OnAnimationCompleteEventPayload;
  }) => void;

  /** @deprecated Not implemented: ignored (a dev warning is logged). */
  scene?: SceneDescriptor;
  /** @deprecated Not implemented: ignored (a dev warning is logged). */
  camera?: CameraDescriptor;
  /** @deprecated Not implemented: ignored (a dev warning is logged). */
  lighting?: LightingDescriptor;
};

// Scene Types (not implemented)

/** @experimental Not implemented. */
export type SceneDescriptor = {
  meshes: Mesh[];
  textures: Texture[];
  materials: MaterialDescriptor[];
  animations: Animation[];
  ambientLightColor?: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  directionalLightColor?: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  directionalLightDirection?: { x: number; y: number; z: number };
};

/** @experimental Not implemented. */
export type CameraDescriptor = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
  aspectRatio: number;
};

/** @experimental Not implemented. */
export type LightingDescriptor = {
  ambientColor: { red: number; green: number; blue: number; alpha: number };
  directionalColor: { red: number; green: number; blue: number; alpha: number };
  directionalDirection: { x: number; y: number; z: number };
  pointLights: PointLightDescriptor[];
  spotLights: SpotLightDescriptor[];
};

/** @experimental Not implemented. */
export type PointLightDescriptor = {
  position: { x: number; y: number; z: number };
  color: { red: number; green: number; blue: number; alpha: number };
  intensity: number;
  attenuation: { constant: number; linear: number; quadratic: number };
};

/** @experimental Not implemented. */
export type SpotLightDescriptor = {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: { red: number; green: number; blue: number; alpha: number };
  intensity: number;
  innerConeAngle: number;
  outerConeAngle: number;
  attenuation: { constant: number; linear: number; quadratic: number };
};

/** @experimental Not implemented. */
export type MaterialDescriptor = {
  id: string;
  diffuseColor: { red: number; green: number; blue: number; alpha: number };
  specularColor: { red: number; green: number; blue: number; alpha: number };
  shininess: number;
  diffuseTexture?: Texture;
  normalTexture?: Texture;
  specularTexture?: Texture;
  emissiveTexture?: Texture;
  metallicTexture?: Texture;
  roughnessTexture?: Texture;
  occlusionTexture?: Texture;
};

// 2D Drawing Types (not implemented: the 2D canvas API has no native code)

/** @experimental Part of the unimplemented 2D canvas API. */
export type Point2D = {
  x: number;
  y: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Color2D = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type BrushStyle = {
  color: Color2D;
  size: number;
  opacity: number;
  blendMode?:
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "softLight"
    | "hardLight"
    | "colorDodge"
    | "colorBurn"
    | "darken"
    | "lighten"
    | "difference"
    | "exclusion";
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type LineStyle = {
  color: Color2D;
  width: number;
  capStyle?: "butt" | "round" | "square";
  joinStyle?: "miter" | "round" | "bevel";
  dashPattern?: number[];
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type FillStyle = {
  color: Color2D;
  pattern?: "solid" | "horizontal" | "vertical" | "diagonal" | "crosshatch";
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  fontStyle?: "normal" | "italic" | "oblique";
  color: Color2D;
  alignment?: "left" | "center" | "right";
  baseline?: "top" | "middle" | "bottom" | "alphabetic" | "hanging";
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Rectangle2D = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Circle2D = {
  center: Point2D;
  radius: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Ellipse2D = {
  center: Point2D;
  radiusX: number;
  radiusY: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Path2D = {
  points: Point2D[];
  closed: boolean;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type Canvas2D = {
  id: string;
  width: number;
  height: number;
  pixelFormat: MTLPixelFormat;
  texture: Texture;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type DrawingCommand = {
  id: string;
  type: "line" | "rectangle" | "circle" | "ellipse" | "path" | "text" | "image";
  data: unknown;
  style: BrushStyle | LineStyle | FillStyle | TextStyle;
  timestamp: number;
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type DrawingLayer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  commands: DrawingCommand[];
};

/** @experimental Part of the unimplemented 2D canvas API. */
export type DrawingCanvas = {
  id: string;
  width: number;
  height: number;
  layers: DrawingLayer[];
  activeLayerId: string;
  backgroundColor: Color2D;
};
