import { NativeModule, requireNativeModule } from "expo";

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

/** Marker used in JSDoc: the method rejects with `ERR_NOT_IMPLEMENTED` on every platform. */
type NotImplemented<T> = Promise<T>;

export declare class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  PI: number;

  // Device

  /** True on iOS devices/simulators with a Metal GPU. Always false on Android and web. */
  isMetalAvailable(): boolean;
  getDeviceInfo(): Promise<DeviceInfo>;

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

export default requireNativeModule<MunimMetalkitModule>("MunimMetalkit");
