import { NativeModule, requireNativeModule } from "expo";

import {
  MunimMetalkitModuleEvents,
  TextureDescriptor,
  Texture,
  BufferDescriptor,
  Buffer,
  ShaderDescriptor,
  RenderPipelineState,
  MeshDescriptor,
  Mesh,
  AnimationDescriptor,
  Animation,
  SceneDescriptor,
  CameraDescriptor,
  LightingDescriptor,
  MTLPixelFormat,
  Canvas2D,
  Color2D,
  Point2D,
  LineStyle,
  Rectangle2D,
  FillStyle,
  Circle2D,
  Ellipse2D,
  Path2D,
  TextStyle,
  DrawingLayer,
  BrushStyle,
} from "./MunimMetalkit.types";

declare class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  // Constants
  PI: number;

  // Basic functions
  hello(): string;
  setValueAsync(value: string): Promise<void>;

  // Device and Context
  isMetalAvailable(): boolean;
  getDeviceInfo(): Promise<{
    name: string;
    maxThreadsPerGroup: number;
    maxThreadgroupMemoryLength: number;
  }>;

  // Texture Management
  createTexture(descriptor: TextureDescriptor): Promise<Texture>;
  loadTextureFromURL(url: string): Promise<Texture>;
  loadTextureFromData(
    data: ArrayBuffer,
    descriptor: TextureDescriptor
  ): Promise<Texture>;
  updateTexture(
    textureId: string,
    data: ArrayBuffer,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<void>;
  generateMipmaps(textureId: string): Promise<void>;
  releaseTexture(textureId: string): Promise<void>;

  // Buffer Management
  createBuffer(descriptor: BufferDescriptor): Promise<Buffer>;
  createBufferWithData(data: ArrayBuffer, options?: string): Promise<Buffer>;
  updateBuffer(
    bufferId: string,
    data: ArrayBuffer,
    offset?: number
  ): Promise<void>;
  getBufferContents(bufferId: string): Promise<ArrayBuffer>;
  releaseBuffer(bufferId: string): Promise<void>;

  // Shader Management
  createShaderLibrary(source: string): Promise<string>;
  createRenderPipelineState(
    descriptor: ShaderDescriptor
  ): Promise<RenderPipelineState>;
  createComputePipelineState(computeFunction: string): Promise<string>;
  releaseRenderPipelineState(pipelineId: string): Promise<void>;

  // Mesh Management
  createMesh(descriptor: MeshDescriptor): Promise<Mesh>;
  loadMeshFromURL(url: string): Promise<Mesh>;
  loadMeshFromData(
    data: ArrayBuffer,
    format: "obj" | "ply" | "stl"
  ): Promise<Mesh>;
  updateMesh(
    meshId: string,
    descriptor: Partial<MeshDescriptor>
  ): Promise<void>;
  releaseMesh(meshId: string): Promise<void>;

  // Animation Management
  createAnimation(descriptor: AnimationDescriptor): Promise<Animation>;
  startAnimation(animationId: string): Promise<void>;
  pauseAnimation(animationId: string): Promise<void>;
  stopAnimation(animationId: string): Promise<void>;
  setAnimationTime(animationId: string, time: number): Promise<void>;
  releaseAnimation(animationId: string): Promise<void>;

  // Scene Management
  setScene(scene: SceneDescriptor): Promise<void>;
  updateCamera(camera: CameraDescriptor): Promise<void>;
  updateLighting(lighting: LightingDescriptor): Promise<void>;

  // Rendering Control
  startRendering(): Promise<void>;
  stopRendering(): Promise<void>;
  pauseRendering(): Promise<void>;
  resumeRendering(): Promise<void>;
  setNeedsDisplay(): Promise<void>;

  // View Configuration
  setPreferredFramesPerSecond(fps: number): Promise<void>;
  setClearColor(
    red: number,
    green: number,
    blue: number,
    alpha: number
  ): Promise<void>;
  setDrawableSize(width: number, height: number): Promise<void>;

  // Utility Functions
  takeScreenshot(): Promise<ArrayBuffer>;
  getPerformanceInfo(): Promise<{
    frameTime: number;
    drawCallCount: number;
    triangleCount: number;
  }>;

  // 2D Drawing Functions
  createCanvas2D(
    width: number,
    height: number,
    pixelFormat?: MTLPixelFormat
  ): Promise<Canvas2D>;
  clearCanvas2D(canvasId: string, backgroundColor?: Color2D): Promise<void>;

  // 2D Primitive Drawing
  drawLine2D(
    canvasId: string,
    start: Point2D,
    end: Point2D,
    style: LineStyle
  ): Promise<void>;
  drawRectangle2D(
    canvasId: string,
    rect: Rectangle2D,
    style: FillStyle | LineStyle
  ): Promise<void>;
  drawCircle2D(
    canvasId: string,
    circle: Circle2D,
    style: FillStyle | LineStyle
  ): Promise<void>;
  drawEllipse2D(
    canvasId: string,
    ellipse: Ellipse2D,
    style: FillStyle | LineStyle
  ): Promise<void>;
  drawPath2D(canvasId: string, path: Path2D, style: LineStyle): Promise<void>;

  // 2D Text Rendering
  drawText2D(
    canvasId: string,
    text: string,
    position: Point2D,
    style: TextStyle
  ): Promise<void>;
  measureText2D(
    text: string,
    style: TextStyle
  ): Promise<{ width: number; height: number }>;

  // 2D Image Operations
  drawImage2D(
    canvasId: string,
    imageTextureId: string,
    destination: Rectangle2D,
    source?: Rectangle2D
  ): Promise<void>;
  compositeCanvas2D(
    canvasId: string,
    sourceCanvasId: string,
    operation:
      | "source-over"
      | "source-in"
      | "source-out"
      | "source-atop"
      | "destination-over"
      | "destination-in"
      | "destination-out"
      | "destination-atop"
      | "xor"
      | "lighter"
      | "copy"
      | "multiply"
      | "screen"
      | "overlay"
      | "darken"
      | "lighten"
      | "color-dodge"
      | "color-burn"
      | "hard-light"
      | "soft-light"
      | "difference"
      | "exclusion"
  ): Promise<void>;

  // 2D Transformations
  saveCanvas2D(canvasId: string): Promise<void>;
  restoreCanvas2D(canvasId: string): Promise<void>;
  translateCanvas2D(canvasId: string, x: number, y: number): Promise<void>;
  rotateCanvas2D(canvasId: string, angle: number): Promise<void>;
  scaleCanvas2D(canvasId: string, x: number, y: number): Promise<void>;
  setTransformCanvas2D(canvasId: string, matrix: number[]): Promise<void>;

  // 2D Layer Management
  createDrawingLayer(canvasId: string, name: string): Promise<DrawingLayer>;
  deleteDrawingLayer(canvasId: string, layerId: string): Promise<void>;
  setActiveLayer(canvasId: string, layerId: string): Promise<void>;
  setLayerOpacity(
    canvasId: string,
    layerId: string,
    opacity: number
  ): Promise<void>;
  setLayerBlendMode(
    canvasId: string,
    layerId: string,
    blendMode: string
  ): Promise<void>;
  toggleLayerVisibility(canvasId: string, layerId: string): Promise<void>;

  // 2D Brush and Tool Management
  setBrushStyle(canvasId: string, style: BrushStyle): Promise<void>;
  setLineStyle(canvasId: string, style: LineStyle): Promise<void>;
  setFillStyle(canvasId: string, style: FillStyle): Promise<void>;
  setTextStyle(canvasId: string, style: TextStyle): Promise<void>;

  // 2D Canvas Operations
  resizeCanvas2D(
    canvasId: string,
    width: number,
    height: number
  ): Promise<void>;
  cropCanvas2D(canvasId: string, rect: Rectangle2D): Promise<void>;
  flipCanvas2D(
    canvasId: string,
    horizontal: boolean,
    vertical: boolean
  ): Promise<void>;
  rotateCanvas2D(canvasId: string, angle: number): Promise<void>;

  // 2D Export and Import
  exportCanvas2D(
    canvasId: string,
    format: "png" | "jpg" | "webp"
  ): Promise<ArrayBuffer>;
  importImageToCanvas2D(
    canvasId: string,
    imageData: ArrayBuffer,
    position: Point2D
  ): Promise<void>;

  // 2D Utility Functions
  getCanvas2DPixel(canvasId: string, x: number, y: number): Promise<Color2D>;
  setCanvas2DPixel(
    canvasId: string,
    x: number,
    y: number,
    color: Color2D
  ): Promise<void>;
  getCanvas2DData(canvasId: string): Promise<ArrayBuffer>;
  setCanvas2DData(canvasId: string, data: ArrayBuffer): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MunimMetalkitModule>("MunimMetalkit");
