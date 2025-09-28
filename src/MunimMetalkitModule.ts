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
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MunimMetalkitModule>("MunimMetalkit");
