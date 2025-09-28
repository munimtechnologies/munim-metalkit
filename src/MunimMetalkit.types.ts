import type { StyleProp, ViewStyle } from "react-native";

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
  | "Depth32Float"
  | "Depth24Unorm_Stencil8"
  | "Depth32Float_Stencil8";

export type MTLPrimitiveType =
  | "Point"
  | "Line"
  | "LineStrip"
  | "Triangle"
  | "TriangleStrip";

export type MTLWinding = "Clockwise" | "CounterClockwise";

export type MTLCullMode = "None" | "Front" | "Back";

export type MTLFillMode = "Fill" | "Lines";

export type MTLBlendOperation =
  | "Add"
  | "Subtract"
  | "ReverseSubtract"
  | "Min"
  | "Max";

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

// Texture Types
export type TextureDescriptor = {
  width: number;
  height: number;
  pixelFormat: MTLPixelFormat;
  usage?: "ShaderRead" | "ShaderWrite" | "RenderTarget" | "PixelFormatView";
  mipmapLevelCount?: number;
  sampleCount?: number;
  arrayLength?: number;
  depth?: number;
  storageMode?: "Shared" | "Managed" | "Private";
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
};

// Buffer Types
export type BufferDescriptor = {
  length: number;
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
  contents?: ArrayBuffer;
};

// Shader Types
export type ShaderDescriptor = {
  vertexFunction?: string;
  fragmentFunction?: string;
  computeFunction?: string;
  vertexDescriptor?: VertexDescriptor;
  colorAttachments?: ColorAttachmentDescriptor[];
  depthAttachmentPixelFormat?: MTLPixelFormat;
  stencilAttachmentPixelFormat?: MTLPixelFormat;
  sampleCount?: number;
  rasterSampleCount?: number;
  alphaToCoverageEnabled?: boolean;
  alphaToOneEnabled?: boolean;
  rasterizationEnabled?: boolean;
  inputPrimitiveTopology?: "Unspecified" | "Point" | "Line" | "Triangle";
  tessellationPartitionMode?:
    | "Pow2"
    | "Integer"
    | "FractionalOdd"
    | "FractionalEven";
  maxTessellationFactor?: number;
  tessellationFactorScaleEnabled?: boolean;
  tessellationFactorFormat?: "Half" | "Float";
  tessellationControlPointIndexType?: "None" | "UInt16" | "UInt32";
  tessellationFactorStepFunction?:
    | "Constant"
    | "PerPatch"
    | "PerPatchAndPerInstance"
    | "PerInstance"
    | "PerPatchAndPerInstance";
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
  writeMask: "None" | "Red" | "Green" | "Blue" | "Alpha" | "All";
};

// Render Pipeline Types
export type RenderPipelineState = {
  id: string;
  vertexFunction: string;
  fragmentFunction: string;
  vertexDescriptor?: VertexDescriptor;
  colorAttachments: ColorAttachmentDescriptor[];
  depthAttachmentPixelFormat?: MTLPixelFormat;
  stencilAttachmentPixelFormat?: MTLPixelFormat;
  sampleCount: number;
  rasterSampleCount: number;
  alphaToCoverageEnabled: boolean;
  alphaToOneEnabled: boolean;
  rasterizationEnabled: boolean;
};

// Command Types
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

// Mesh Types
export type MeshDescriptor = {
  vertexBuffers: Buffer[];
  vertexCount: number;
  primitiveType: MTLPrimitiveType;
  indexBuffer?: Buffer;
  indexCount?: number;
  indexType?: "UInt16" | "UInt32";
};

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

export type Submesh = {
  indexBuffer: Buffer;
  indexCount: number;
  indexType: "UInt16" | "UInt32";
  primitiveType: MTLPrimitiveType;
  geometryType: "TypePoint" | "TypeLine" | "TypeTriangle" | "TypeTriangleStrip";
  materialIndex: number;
};

// Animation Types
export type AnimationDescriptor = {
  duration: number;
  repeatCount?: number;
  autoreverses?: boolean;
  timingFunction?:
    | "Linear"
    | "EaseIn"
    | "EaseOut"
    | "EaseInEaseOut"
    | "Default";
};

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
  url: string;
};

export type OnRenderEventPayload = {
  frameTime: number;
  drawableCount: number;
};

export type OnErrorEventPayload = {
  error: string;
  code: number;
};

export type OnAnimationCompleteEventPayload = {
  animationId: string;
  completed: boolean;
};

export type MunimMetalkitModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onRender: (params: OnRenderEventPayload) => void;
  onError: (params: OnErrorEventPayload) => void;
  onAnimationComplete: (params: OnAnimationCompleteEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

// View Props
export type MunimMetalkitViewProps = {
  // Basic props
  style?: StyleProp<ViewStyle>;

  // Rendering props
  preferredFramesPerSecond?: number;
  enableSetNeedsDisplay?: boolean;
  autoResizeDrawable?: boolean;
  drawableSize?: { width: number; height: number };
  colorPixelFormat?: MTLPixelFormat;
  depthStencilPixelFormat?: MTLPixelFormat;
  sampleCount?: number;
  clearColor?: { red: number; green: number; blue: number; alpha: number };

  // Event handlers
  onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void;
  onRender?: (event: { nativeEvent: OnRenderEventPayload }) => void;
  onError?: (event: { nativeEvent: OnErrorEventPayload }) => void;
  onAnimationComplete?: (event: {
    nativeEvent: OnAnimationCompleteEventPayload;
  }) => void;

  // Scene props
  scene?: SceneDescriptor;
  camera?: CameraDescriptor;
  lighting?: LightingDescriptor;
};

// Scene Types
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

export type CameraDescriptor = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
  aspectRatio: number;
};

export type LightingDescriptor = {
  ambientColor: { red: number; green: number; blue: number; alpha: number };
  directionalColor: { red: number; green: number; blue: number; alpha: number };
  directionalDirection: { x: number; y: number; z: number };
  pointLights: PointLightDescriptor[];
  spotLights: SpotLightDescriptor[];
};

export type PointLightDescriptor = {
  position: { x: number; y: number; z: number };
  color: { red: number; green: number; blue: number; alpha: number };
  intensity: number;
  attenuation: { constant: number; linear: number; quadratic: number };
};

export type SpotLightDescriptor = {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: { red: number; green: number; blue: number; alpha: number };
  intensity: number;
  innerConeAngle: number;
  outerConeAngle: number;
  attenuation: { constant: number; linear: number; quadratic: number };
};

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

// 2D Drawing Types
export type Point2D = {
  x: number;
  y: number;
};

export type Color2D = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

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

export type LineStyle = {
  color: Color2D;
  width: number;
  capStyle?: "butt" | "round" | "square";
  joinStyle?: "miter" | "round" | "bevel";
  dashPattern?: number[];
};

export type FillStyle = {
  color: Color2D;
  pattern?: "solid" | "horizontal" | "vertical" | "diagonal" | "crosshatch";
};

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

export type Rectangle2D = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Circle2D = {
  center: Point2D;
  radius: number;
};

export type Ellipse2D = {
  center: Point2D;
  radiusX: number;
  radiusY: number;
};

export type Path2D = {
  points: Point2D[];
  closed: boolean;
};

export type Canvas2D = {
  id: string;
  width: number;
  height: number;
  pixelFormat: MTLPixelFormat;
  texture: Texture;
};

export type DrawingCommand = {
  id: string;
  type: "line" | "rectangle" | "circle" | "ellipse" | "path" | "text" | "image";
  data: any;
  style: BrushStyle | LineStyle | FillStyle | TextStyle;
  timestamp: number;
};

export type DrawingLayer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  commands: DrawingCommand[];
};

export type DrawingCanvas = {
  id: string;
  width: number;
  height: number;
  layers: DrawingLayer[];
  activeLayerId: string;
  backgroundColor: Color2D;
};
