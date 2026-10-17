import type { HybridObject } from "react-native-nitro-modules";

/*
 * Native (Nitro) spec of the munim-metalkit module.
 *
 * These are wire types, not the public API: the public types live in `MunimMetalkit.types.ts`
 * and `MunimMetalkitModule.ts` adapts between the two (typed arrays -> ArrayBuffer, `undefined`
 * -> `null`, `{ nativeEvent }` wrappers, error codes). Enum-like values (pixel formats, storage
 * modes, ...) are plain strings here so that unknown values reach native code and are rejected
 * with `ERR_INVALID_ARGUMENT`, as before, instead of failing JSI conversion.
 *
 * Every input field is optional because native code applies the documented defaults.
 * Rejections carry their error code as a `[ERR_...]` message prefix, which the TypeScript
 * wrapper turns into `error.code`.
 */

export interface NativeSize {
  width: number;
  height: number;
  depth: number;
}

export interface NativeThreadSize {
  width?: number;
  height?: number;
  depth?: number;
}

export interface NativeDeviceInfo {
  name: string;
  maxThreadsPerThreadgroup: NativeSize;
  maxThreadgroupMemoryLength: number;
  maxBufferLength: number;
  recommendedMaxWorkingSetSize: number;
  hasUnifiedMemory: boolean;
  gpuFamilies: string[];
}

export interface NativeMetalCapabilities {
  osVersion: string;
  compiledWithMetal4SDK: boolean;
  appleGPUFamily?: number;
  metal3: boolean;
  metal4: boolean;
  mtl4CommandQueue: boolean;
  mtl4Compiler: boolean;
  tensors: boolean;
  residencySets: boolean;
  raytracing: boolean;
  unsupportedReason?: string;
}

export interface NativeTextureDescriptor {
  width?: number;
  height?: number;
  pixelFormat?: string;
  /** Normalised to a list by the wrapper. */
  usage?: string[];
  mipmapLevelCount?: number;
  sampleCount?: number;
  arrayLength?: number;
  depth?: number;
  storageMode?: string;
}

export interface NativeTexture {
  id: string;
  width: number;
  height: number;
  pixelFormat: string;
  mipmapLevelCount: number;
  sampleCount: number;
  arrayLength: number;
  depth: number;
  storageMode: string;
}

export interface NativeTextureLoadOptions {
  srgb?: boolean;
  storageMode?: string;
  generateMipmaps?: boolean;
}

export interface NativeTextureRegion {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface NativeTextureTransferOptions {
  bytesPerRow?: number;
  mipmapLevel?: number;
  slice?: number;
}

export interface NativeBufferDescriptor {
  length?: number;
  options?: string;
}

export interface NativeBuffer {
  id: string;
  length: number;
  storageMode: string;
}

export interface NativeComputePipelineState {
  id: string;
  functionName: string;
  threadExecutionWidth: number;
  maxTotalThreadsPerThreadgroup: number;
}

export interface NativeDispatchOptions {
  threadsPerThreadgroup?: NativeThreadSize;
  textures?: string[];
}

export interface NativeComputeDispatchResult {
  gpuTimeMs?: number;
  cpuTimeMs: number;
  threadgroups: NativeSize;
  threadsPerThreadgroup: NativeSize;
}

export interface NativeColorAttachment {
  pixelFormat?: string;
  isBlendingEnabled?: boolean;
  rgbBlendOperation?: string;
  alphaBlendOperation?: string;
  sourceRGBBlendFactor?: string;
  sourceAlphaBlendFactor?: string;
  destinationRGBBlendFactor?: string;
  destinationAlphaBlendFactor?: string;
}

export interface NativeRenderPipelineDescriptor {
  libraryId?: string;
  vertexFunction?: string;
  fragmentFunction?: string;
  colorAttachments?: NativeColorAttachment[];
  depthAttachmentPixelFormat?: string;
  stencilAttachmentPixelFormat?: string;
  sampleCount?: number;
  alphaToCoverageEnabled?: boolean;
  alphaToOneEnabled?: boolean;
  rasterizationEnabled?: boolean;
}

export interface NativeColorAttachmentInfo {
  pixelFormat: string;
  isBlendingEnabled: boolean;
}

export interface NativeRenderPipelineState {
  id: string;
  vertexFunction: string;
  fragmentFunction: string;
  colorAttachments: NativeColorAttachmentInfo[];
  sampleCount: number;
  rasterSampleCount: number;
  alphaToCoverageEnabled: boolean;
  alphaToOneEnabled: boolean;
  rasterizationEnabled: boolean;
}

export interface NativeScreenshotOptions {
  result?: string;
}

export interface NativeScreenshot {
  width: number;
  height: number;
  base64?: string;
  uri?: string;
}

export interface NativeResourceCounts {
  textures: number;
  buffers: number;
  shaderLibraries: number;
  computePipelines: number;
  renderPipelines: number;
}

/** View frame statistics (also the `onRender` payload). */
export interface NativeFrameStats {
  frameTime: number;
  fps: number;
  gpuFrameTime?: number;
  lastComputeGpuTime?: number;
  framesRendered: number;
  drawCallCount: number;
  triangleCount: number;
}

export interface NativePerformanceInfo {
  stats: NativeFrameStats;
  deviceName?: string;
  recommendedMaxWorkingSetSize?: number;
  currentAllocatedSize?: number;
  resourceCounts: NativeResourceCounts;
}

export interface MunimMetalkit extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // Device
  isMetalAvailable(): boolean;
  getDeviceInfo(): Promise<NativeDeviceInfo>;
  getMetalCapabilities(): Promise<NativeMetalCapabilities>;

  // Textures
  createTexture(descriptor: NativeTextureDescriptor): Promise<NativeTexture>;
  loadTextureFromURL(
    url: string,
    options?: NativeTextureLoadOptions,
  ): Promise<NativeTexture>;
  loadTextureFromData(
    data: ArrayBuffer,
    options?: NativeTextureLoadOptions,
  ): Promise<NativeTexture>;
  updateTexture(
    textureId: string,
    data: ArrayBuffer,
    region?: NativeTextureRegion,
    options?: NativeTextureTransferOptions,
  ): Promise<void>;
  readTexture(
    textureId: string,
    region?: NativeTextureRegion,
    options?: NativeTextureTransferOptions,
  ): Promise<ArrayBuffer>;
  generateMipmaps(textureId: string): Promise<void>;
  releaseTexture(textureId: string): Promise<void>;

  // Buffers
  createBuffer(descriptor: NativeBufferDescriptor): Promise<NativeBuffer>;
  createBufferWithData(
    data: ArrayBuffer,
    options?: string,
  ): Promise<NativeBuffer>;
  updateBuffer(
    bufferId: string,
    data: ArrayBuffer,
    offset?: number,
  ): Promise<void>;
  getBufferContents(bufferId: string): Promise<ArrayBuffer>;
  releaseBuffer(bufferId: string): Promise<void>;

  // Shaders and pipelines
  createShaderLibrary(source: string): Promise<string>;
  getShaderLibraryFunctionNames(libraryId: string): Promise<string[]>;
  releaseShaderLibrary(libraryId: string): Promise<void>;
  createComputePipelineState(
    libraryId: string,
    functionName: string,
  ): Promise<NativeComputePipelineState>;
  releaseComputePipelineState(pipelineId: string): Promise<void>;
  dispatchCompute(
    pipelineId: string,
    buffers: string[],
    threadgroups: NativeThreadSize,
    options?: NativeDispatchOptions,
  ): Promise<NativeComputeDispatchResult>;
  createRenderPipelineState(
    descriptor: NativeRenderPipelineDescriptor,
  ): Promise<NativeRenderPipelineState>;
  releaseRenderPipelineState(pipelineId: string): Promise<void>;

  // View control (applies to every mounted MunimMetalkitView)
  startRendering(): Promise<void>;
  stopRendering(): Promise<void>;
  pauseRendering(): Promise<void>;
  resumeRendering(): Promise<void>;
  setNeedsDisplay(): Promise<void>;
  setPreferredFramesPerSecond(fps: number): Promise<void>;
  setClearColor(
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ): Promise<void>;
  setDrawableSize(width: number, height: number): Promise<void>;

  // Utilities
  takeScreenshot(options?: NativeScreenshotOptions): Promise<NativeScreenshot>;
  getPerformanceInfo(): Promise<NativePerformanceInfo>;
}
