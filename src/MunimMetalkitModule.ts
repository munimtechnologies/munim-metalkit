import { Platform } from "react-native";
import { NitroModules } from "react-native-nitro-modules";

import type {
  Animation,
  AnimationDescriptor,
  BinaryData,
  BrushStyle,
  Buffer,
  BufferDescriptor,
  CameraDescriptor,
  Canvas2D,
  Circle2D,
  Color2D,
  ComputeDispatchResult,
  ComputePipelineState,
  DeviceInfo,
  DispatchComputeOptions,
  DrawingLayer,
  Ellipse2D,
  FillStyle,
  LightingDescriptor,
  LineStyle,
  MTLPixelFormat,
  Mesh,
  MetalCapabilities,
  MeshDescriptor,
  MunimMetalkitModuleEvents,
  Path2D,
  PerformanceInfo,
  Point2D,
  Rectangle2D,
  RenderPipelineState,
  SceneDescriptor,
  Screenshot,
  ScreenshotOptions,
  ShaderDescriptor,
  TextStyle,
  Texture,
  TextureDescriptor,
  TextureLoadOptions,
  TextureRegion,
  TextureTransferOptions,
  ThreadSize,
} from "./MunimMetalkit.types";
import { call, makeError, toArrayBuffer, toScreenshot } from "./internal";
import { NOT_IMPLEMENTED_METHOD_NAMES } from "./methodNames";
import type {
  MunimMetalkit as MunimMetalkitSpec,
  NativeBuffer,
  NativeComputeDispatchResult,
  NativeDeviceInfo,
  NativeMetalCapabilities,
  NativePerformanceInfo,
  NativeRenderPipelineDescriptor,
  NativeRenderPipelineState,
  NativeTexture,
  NativeTextureDescriptor,
} from "./specs/MunimMetalkit.nitro";

/** Marker used in JSDoc: the method rejects with `ERR_NOT_IMPLEMENTED` on every platform. */
type NotImplemented<T> = Promise<T>;

/** A subscription returned by `addListener`. */
export type MunimMetalkitSubscription = { remove(): void };

/**
 * The native module, backed by a Nitro HybridObject. The module emits no events; the listener
 * methods (kept from the Expo `NativeModule` base class of 2.x) are no-ops.
 */
export declare class MunimMetalkitModule {
  PI: number;

  // Events: the module emits none (kept for compatibility with 2.x)

  addListener<EventName extends keyof MunimMetalkitModuleEvents>(
    eventName: EventName,
    listener: MunimMetalkitModuleEvents[EventName],
  ): MunimMetalkitSubscription;
  removeListener<EventName extends keyof MunimMetalkitModuleEvents>(
    eventName: EventName,
    listener: MunimMetalkitModuleEvents[EventName],
  ): void;
  removeAllListeners(eventName: keyof MunimMetalkitModuleEvents): void;
  emit<EventName extends keyof MunimMetalkitModuleEvents>(
    eventName: EventName,
    ...args: never[]
  ): void;
  listenerCount<EventName extends keyof MunimMetalkitModuleEvents>(
    eventName: EventName,
  ): number;

  // Device

  /** True on iOS devices/simulators with a Metal GPU. Always false on Android and web. */
  isMetalAvailable(): boolean;
  getDeviceInfo(): Promise<DeviceInfo>;
  /**
   * Reports Metal 4 support (MTL4 command queue and compiler, `MTLTensor`), residency sets and the
   * Apple GPU family. Never rejects on iOS for missing features; they are reported as `false`.
   */
  getMetalCapabilities(): Promise<MetalCapabilities>;

  // Textures

  createTexture(descriptor: TextureDescriptor): Promise<Texture>;
  /** Loads an image from a `file://` or `http(s)://` URL. */
  loadTextureFromURL(
    url: string,
    options?: TextureLoadOptions,
  ): Promise<Texture>;
  /** Decodes encoded image bytes (PNG, JPEG, ...). */
  loadTextureFromData(
    data: BinaryData,
    options?: TextureLoadOptions,
  ): Promise<Texture>;
  /** Uploads tightly packed texels (or `options.bytesPerRow`-strided rows) into a region. */
  updateTexture(
    textureId: string,
    data: BinaryData,
    region?: TextureRegion,
    options?: TextureTransferOptions,
  ): Promise<void>;
  /** Reads texels back. Works for Shared and Private textures. */
  readTexture(
    textureId: string,
    region?: TextureRegion,
    options?: TextureTransferOptions,
  ): Promise<ArrayBuffer>;
  generateMipmaps(textureId: string): Promise<void>;
  releaseTexture(textureId: string): Promise<void>;

  // Buffers

  createBuffer(descriptor: BufferDescriptor): Promise<Buffer>;
  /** `data` must not be empty. */
  createBufferWithData(
    data: BinaryData,
    options?: BufferDescriptor["options"],
  ): Promise<Buffer>;
  updateBuffer(
    bufferId: string,
    data: BinaryData,
    offset?: number,
  ): Promise<void>;
  getBufferContents(bufferId: string): Promise<ArrayBuffer>;
  releaseBuffer(bufferId: string): Promise<void>;

  // Shaders and pipelines

  /**
   * Compiles Metal Shading Language source and returns a library id. Compiler errors reject with
   * `ERR_SHADER_COMPILATION` and include the compiler log.
   */
  createShaderLibrary(source: string): Promise<string>;
  getShaderLibraryFunctionNames(libraryId: string): Promise<string[]>;
  releaseShaderLibrary(libraryId: string): Promise<void>;
  /** Builds a compute pipeline from a `kernel` function in a library. */
  createComputePipelineState(
    libraryId: string,
    functionName: string,
  ): Promise<ComputePipelineState>;
  releaseComputePipelineState(pipelineId: string): Promise<void>;
  /**
   * Encodes one compute dispatch, waits for it to finish, and reports its GPU time.
   * `buffers[i]` is bound at `[[buffer(i)]]`.
   */
  dispatchCompute(
    pipelineId: string,
    buffers: string[],
    threadgroups: ThreadSize,
    options?: DispatchComputeOptions,
  ): Promise<ComputeDispatchResult>;
  /**
   * Builds (and validates) a render pipeline from vertex + fragment functions. There is no JS draw
   * API yet, so the pipeline cannot be used for drawing from JavaScript.
   */
  createRenderPipelineState(
    descriptor: ShaderDescriptor,
  ): Promise<RenderPipelineState>;
  releaseRenderPipelineState(pipelineId: string): Promise<void>;

  // View control: applies to every mounted MunimMetalkitView

  startRendering(): Promise<void>;
  stopRendering(): Promise<void>;
  pauseRendering(): Promise<void>;
  resumeRendering(): Promise<void>;
  /** Renders one frame on every mounted view. */
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

  /**
   * Captures the most recently mounted MunimMetalkitView as a PNG. Prefer the view ref's
   * `takeScreenshot()` when more than one view is mounted.
   */
  takeScreenshot(options?: ScreenshotOptions): Promise<Screenshot>;
  getPerformanceInfo(): Promise<PerformanceInfo>;

  // Mesh management: not implemented

  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  createMesh(descriptor: MeshDescriptor): NotImplemented<Mesh>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  loadMeshFromURL(url: string): NotImplemented<Mesh>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  loadMeshFromData(
    data: BinaryData,
    format: "obj" | "ply" | "stl",
  ): NotImplemented<Mesh>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  updateMesh(
    meshId: string,
    descriptor: Partial<MeshDescriptor>,
  ): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  releaseMesh(meshId: string): NotImplemented<void>;

  // Animation management: not implemented

  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  createAnimation(descriptor: AnimationDescriptor): NotImplemented<Animation>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  startAnimation(animationId: string): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  pauseAnimation(animationId: string): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  stopAnimation(animationId: string): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setAnimationTime(animationId: string, time: number): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  releaseAnimation(animationId: string): NotImplemented<void>;

  // Scene management: not implemented

  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setScene(scene: SceneDescriptor): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  updateCamera(camera: CameraDescriptor): NotImplemented<void>;
  /** @experimental Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  updateLighting(lighting: LightingDescriptor): NotImplemented<void>;

  // 2D canvas API: declared since 1.x but never had native code. Every call rejects.

  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  createCanvas2D(
    width: number,
    height: number,
    pixelFormat?: MTLPixelFormat,
  ): NotImplemented<Canvas2D>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  clearCanvas2D(
    canvasId: string,
    backgroundColor?: Color2D,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawLine2D(
    canvasId: string,
    start: Point2D,
    end: Point2D,
    style: LineStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawRectangle2D(
    canvasId: string,
    rect: Rectangle2D,
    style: FillStyle | LineStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawCircle2D(
    canvasId: string,
    circle: Circle2D,
    style: FillStyle | LineStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawEllipse2D(
    canvasId: string,
    ellipse: Ellipse2D,
    style: FillStyle | LineStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawPath2D(
    canvasId: string,
    path: Path2D,
    style: LineStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawText2D(
    canvasId: string,
    text: string,
    position: Point2D,
    style: TextStyle,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  measureText2D(
    text: string,
    style: TextStyle,
  ): NotImplemented<{ width: number; height: number }>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  drawImage2D(
    canvasId: string,
    imageTextureId: string,
    destination: Rectangle2D,
    source?: Rectangle2D,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  compositeCanvas2D(
    canvasId: string,
    sourceCanvasId: string,
    operation: string,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  saveCanvas2D(canvasId: string): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  restoreCanvas2D(canvasId: string): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  translateCanvas2D(
    canvasId: string,
    x: number,
    y: number,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  rotateCanvas2D(canvasId: string, angle: number): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  scaleCanvas2D(canvasId: string, x: number, y: number): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setTransformCanvas2D(
    canvasId: string,
    matrix: number[],
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  createDrawingLayer(
    canvasId: string,
    name: string,
  ): NotImplemented<DrawingLayer>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  deleteDrawingLayer(canvasId: string, layerId: string): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setActiveLayer(canvasId: string, layerId: string): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setLayerOpacity(
    canvasId: string,
    layerId: string,
    opacity: number,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setLayerBlendMode(
    canvasId: string,
    layerId: string,
    blendMode: string,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  toggleLayerVisibility(
    canvasId: string,
    layerId: string,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setBrushStyle(canvasId: string, style: BrushStyle): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setLineStyle(canvasId: string, style: LineStyle): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setFillStyle(canvasId: string, style: FillStyle): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setTextStyle(canvasId: string, style: TextStyle): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  resizeCanvas2D(
    canvasId: string,
    width: number,
    height: number,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  cropCanvas2D(canvasId: string, rect: Rectangle2D): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  flipCanvas2D(
    canvasId: string,
    horizontal: boolean,
    vertical: boolean,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  exportCanvas2D(
    canvasId: string,
    format: "png" | "jpg" | "webp",
  ): NotImplemented<ArrayBuffer>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  importImageToCanvas2D(
    canvasId: string,
    imageData: BinaryData,
    position: Point2D,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  getCanvas2DPixel(
    canvasId: string,
    x: number,
    y: number,
  ): NotImplemented<Color2D>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setCanvas2DPixel(
    canvasId: string,
    x: number,
    y: number,
    color: Color2D,
  ): NotImplemented<void>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  getCanvas2DData(canvasId: string): NotImplemented<ArrayBuffer>;
  /** @deprecated Not implemented: rejects with `ERR_NOT_IMPLEMENTED`. */
  setCanvas2DData(canvasId: string, data: BinaryData): NotImplemented<void>;
}

const native =
  NitroModules.createHybridObject<MunimMetalkitSpec>("MunimMetalkit");

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function toDeviceInfo(info: NativeDeviceInfo): DeviceInfo {
  const { width, height, depth } = info.maxThreadsPerThreadgroup;
  return {
    name: info.name,
    maxThreadsPerGroup: width,
    maxThreadsPerThreadgroup: { width, height, depth },
    maxThreadgroupMemoryLength: info.maxThreadgroupMemoryLength,
    maxBufferLength: info.maxBufferLength,
    recommendedMaxWorkingSetSize: info.recommendedMaxWorkingSetSize,
    hasUnifiedMemory: info.hasUnifiedMemory,
    gpuFamilies: [...info.gpuFamilies],
  };
}

function toCapabilities(caps: NativeMetalCapabilities): MetalCapabilities {
  const result: MetalCapabilities = {
    osVersion: caps.osVersion,
    compiledWithMetal4SDK: caps.compiledWithMetal4SDK,
    appleGPUFamily: nullable(caps.appleGPUFamily),
    metal3: caps.metal3,
    metal4: caps.metal4,
    mtl4CommandQueue: caps.mtl4CommandQueue,
    mtl4Compiler: caps.mtl4Compiler,
    tensors: caps.tensors,
    residencySets: caps.residencySets,
    raytracing: caps.raytracing,
  };
  if (caps.unsupportedReason !== undefined) {
    result.unsupportedReason = caps.unsupportedReason;
  }
  return result;
}

function toTexture(texture: NativeTexture): Texture {
  return {
    ...texture,
    pixelFormat: texture.pixelFormat as MTLPixelFormat,
    storageMode: texture.storageMode as Texture["storageMode"],
  };
}

function toBuffer(buffer: NativeBuffer): Buffer {
  return {
    ...buffer,
    storageMode: buffer.storageMode as Buffer["storageMode"],
  };
}

function toDispatchResult(
  result: NativeComputeDispatchResult,
): ComputeDispatchResult {
  return {
    gpuTimeMs: nullable(result.gpuTimeMs),
    cpuTimeMs: result.cpuTimeMs,
    threadgroups: { ...result.threadgroups },
    threadsPerThreadgroup: { ...result.threadsPerThreadgroup },
  };
}

function toRenderPipeline(
  state: NativeRenderPipelineState,
): RenderPipelineState {
  return {
    ...state,
    colorAttachments: state.colorAttachments.map((attachment) => ({
      pixelFormat: attachment.pixelFormat as MTLPixelFormat,
      isBlendingEnabled: attachment.isBlendingEnabled,
    })),
  };
}

function toPerformanceInfo(info: NativePerformanceInfo): PerformanceInfo {
  const result: PerformanceInfo = {
    frameTime: info.stats.frameTime,
    fps: info.stats.fps,
    gpuFrameTime: nullable(info.stats.gpuFrameTime),
    lastComputeGpuTime: nullable(info.stats.lastComputeGpuTime),
    framesRendered: info.stats.framesRendered,
    drawCallCount: info.stats.drawCallCount,
    triangleCount: info.stats.triangleCount,
    resourceCounts: { ...info.resourceCounts },
  };
  if (info.deviceName !== undefined) result.deviceName = info.deviceName;
  if (info.recommendedMaxWorkingSetSize !== undefined) {
    result.recommendedMaxWorkingSetSize = info.recommendedMaxWorkingSetSize;
  }
  if (info.currentAllocatedSize !== undefined) {
    result.currentAllocatedSize = info.currentAllocatedSize;
  }
  return result;
}

/** `usage` accepts one usage or a list; native code always takes a list. */
function toTextureDescriptor(
  descriptor: TextureDescriptor,
): NativeTextureDescriptor {
  const { usage } = descriptor;
  return {
    ...descriptor,
    usage:
      usage === undefined || usage === null
        ? undefined
        : Array.isArray(usage)
          ? usage
          : [usage],
  };
}

function toRenderPipelineDescriptor(
  descriptor: ShaderDescriptor,
): NativeRenderPipelineDescriptor {
  return {
    libraryId: descriptor.libraryId,
    vertexFunction: descriptor.vertexFunction,
    fragmentFunction: descriptor.fragmentFunction,
    colorAttachments: descriptor.colorAttachments?.map((attachment) => ({
      pixelFormat: attachment.pixelFormat,
      isBlendingEnabled: attachment.isBlendingEnabled,
      rgbBlendOperation: attachment.rgbBlendOperation,
      alphaBlendOperation: attachment.alphaBlendOperation,
      sourceRGBBlendFactor: attachment.sourceRGBBlendFactor,
      sourceAlphaBlendFactor: attachment.sourceAlphaBlendFactor,
      destinationRGBBlendFactor: attachment.destinationRGBBlendFactor,
      destinationAlphaBlendFactor: attachment.destinationAlphaBlendFactor,
    })),
    depthAttachmentPixelFormat: descriptor.depthAttachmentPixelFormat,
    stencilAttachmentPixelFormat: descriptor.stencilAttachmentPixelFormat,
    sampleCount: descriptor.sampleCount,
    alphaToCoverageEnabled: descriptor.alphaToCoverageEnabled,
    alphaToOneEnabled: descriptor.alphaToOneEnabled,
    rasterizationEnabled: descriptor.rasterizationEnabled,
  };
}

/**
 * APIs declared since 1.x without native code. They reject exactly as the native module always
 * did: ERR_NOT_IMPLEMENTED on iOS, ERR_METAL_UNAVAILABLE on Android.
 */
function notImplemented(name: string) {
  return () =>
    Promise.reject(
      Platform.OS === "ios"
        ? makeError(
            "ERR_NOT_IMPLEMENTED",
            `munim-metalkit: ${name}() is not implemented. See the "What works" table in the README.`,
          )
        : makeError(
            "ERR_METAL_UNAVAILABLE",
            `munim-metalkit: ${name}() is unavailable on Android. Metal is only available on iOS.`,
          ),
    );
}

const notImplementedMethods = Object.fromEntries(
  NOT_IMPLEMENTED_METHOD_NAMES.map((name) => [name, notImplemented(name)]),
);

const MunimMetalkit = {
  ...notImplementedMethods,

  PI: Math.PI,

  addListener: () => ({ remove() {} }),
  removeListener() {},
  removeAllListeners() {},
  emit() {},
  listenerCount: () => 0,

  isMetalAvailable: () => native.isMetalAvailable(),
  getDeviceInfo: () =>
    call(async () => toDeviceInfo(await native.getDeviceInfo())),
  getMetalCapabilities: () =>
    call(async () => toCapabilities(await native.getMetalCapabilities())),

  createTexture: (descriptor: TextureDescriptor) =>
    call(async () =>
      toTexture(await native.createTexture(toTextureDescriptor(descriptor))),
    ),
  loadTextureFromURL: (url: string, options?: TextureLoadOptions) =>
    call(async () => toTexture(await native.loadTextureFromURL(url, options))),
  loadTextureFromData: (data: BinaryData, options?: TextureLoadOptions) =>
    call(async () =>
      toTexture(await native.loadTextureFromData(toArrayBuffer(data), options)),
    ),
  updateTexture: (
    textureId: string,
    data: BinaryData,
    region?: TextureRegion,
    options?: TextureTransferOptions,
  ) =>
    call(() =>
      native.updateTexture(textureId, toArrayBuffer(data), region, options),
    ),
  readTexture: (
    textureId: string,
    region?: TextureRegion,
    options?: TextureTransferOptions,
  ) => call(() => native.readTexture(textureId, region, options)),
  generateMipmaps: (textureId: string) =>
    call(() => native.generateMipmaps(textureId)),
  releaseTexture: (textureId: string) =>
    call(() => native.releaseTexture(textureId)),

  createBuffer: (descriptor: BufferDescriptor) =>
    call(async () => toBuffer(await native.createBuffer(descriptor))),
  createBufferWithData: (
    data: BinaryData,
    options?: BufferDescriptor["options"],
  ) =>
    call(async () =>
      toBuffer(await native.createBufferWithData(toArrayBuffer(data), options)),
    ),
  updateBuffer: (bufferId: string, data: BinaryData, offset?: number) =>
    call(() => native.updateBuffer(bufferId, toArrayBuffer(data), offset)),
  getBufferContents: (bufferId: string) =>
    call(() => native.getBufferContents(bufferId)),
  releaseBuffer: (bufferId: string) =>
    call(() => native.releaseBuffer(bufferId)),

  createShaderLibrary: (source: string) =>
    call(() => native.createShaderLibrary(source)),
  getShaderLibraryFunctionNames: (libraryId: string) =>
    call(async () => [
      ...(await native.getShaderLibraryFunctionNames(libraryId)),
    ]),
  releaseShaderLibrary: (libraryId: string) =>
    call(() => native.releaseShaderLibrary(libraryId)),
  createComputePipelineState: (libraryId: string, functionName: string) =>
    call(() => native.createComputePipelineState(libraryId, functionName)),
  releaseComputePipelineState: (pipelineId: string) =>
    call(() => native.releaseComputePipelineState(pipelineId)),
  dispatchCompute: (
    pipelineId: string,
    buffers: string[],
    threadgroups: ThreadSize,
    options?: DispatchComputeOptions,
  ) =>
    call(async () =>
      toDispatchResult(
        await native.dispatchCompute(
          pipelineId,
          buffers,
          threadgroups,
          options,
        ),
      ),
    ),
  createRenderPipelineState: (descriptor: ShaderDescriptor) =>
    call(async () =>
      toRenderPipeline(
        await native.createRenderPipelineState(
          toRenderPipelineDescriptor(descriptor),
        ),
      ),
    ),
  releaseRenderPipelineState: (pipelineId: string) =>
    call(() => native.releaseRenderPipelineState(pipelineId)),

  startRendering: () => call(() => native.startRendering()),
  stopRendering: () => call(() => native.stopRendering()),
  pauseRendering: () => call(() => native.pauseRendering()),
  resumeRendering: () => call(() => native.resumeRendering()),
  setNeedsDisplay: () => call(() => native.setNeedsDisplay()),
  setPreferredFramesPerSecond: (fps: number) =>
    call(() => native.setPreferredFramesPerSecond(fps)),
  setClearColor: (red: number, green: number, blue: number, alpha: number) =>
    call(() => native.setClearColor(red, green, blue, alpha)),
  setDrawableSize: (width: number, height: number) =>
    call(() => native.setDrawableSize(width, height)),

  takeScreenshot: (options?: ScreenshotOptions) =>
    call(async () => toScreenshot(await native.takeScreenshot(options))),
  getPerformanceInfo: () =>
    call(async () => toPerformanceInfo(await native.getPerformanceInfo())),
} as unknown as MunimMetalkitModule;

export default MunimMetalkit;
