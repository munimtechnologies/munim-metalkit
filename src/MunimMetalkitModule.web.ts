import { registerWebModule, NativeModule } from "expo";

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

class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  PI = Math.PI;

  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private textures: Map<string, WebGLTexture> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  private programs: Map<string, WebGLProgram> = new Map();
  private meshes: Map<string, any> = new Map();
  private animations: Map<string, any> = new Map();
  private isWebGLAvailable = false;
  private maxVertexAttribs = 0;
  private maxTextureImageUnits = 0;

  constructor() {
    super();
    this.initializeWebGL();
  }

  private initializeWebGL() {
    try {
      this.canvas = document.createElement("canvas");
      this.gl =
        this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");

      if (this.gl) {
        this.isWebGLAvailable = true;
        this.maxVertexAttribs = this.gl.getParameter(
          this.gl.MAX_VERTEX_ATTRIBS
        );
        this.maxTextureImageUnits = this.gl.getParameter(
          this.gl.MAX_TEXTURE_IMAGE_UNITS
        );
      }
    } catch (e) {
      this.isWebGLAvailable = false;
    }
  }

  // Basic functions
  hello() {
    return "Hello world! 👋";
  }

  async setValueAsync(value: string): Promise<void> {
    this.emit("onChange", { value });
  }

  // Device and Context
  isMetalAvailable(): boolean {
    return this.isWebGLAvailable;
  }

  async getDeviceInfo(): Promise<{
    name: string;
    maxThreadsPerGroup: number;
    maxThreadgroupMemoryLength: number;
  }> {
    return {
      name: this.gl?.getParameter(this.gl?.VERSION) || "WebGL",
      maxThreadsPerGroup: this.maxVertexAttribs,
      maxThreadgroupMemoryLength: this.maxTextureImageUnits,
    };
  }

  // Texture Management
  async createTexture(descriptor: TextureDescriptor): Promise<Texture> {
    if (!this.gl) throw new Error("WebGL not available");

    const texture = this.gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.parsePixelFormat(descriptor.pixelFormat),
      descriptor.width,
      descriptor.height,
      0,
      this.parsePixelFormat(descriptor.pixelFormat),
      this.gl.UNSIGNED_BYTE,
      null
    );

    const textureId = Math.random().toString(36).substr(2, 9);
    this.textures.set(textureId, texture);

    return {
      id: textureId,
      width: descriptor.width,
      height: descriptor.height,
      pixelFormat: descriptor.pixelFormat,
      mipmapLevelCount: descriptor.mipmapLevelCount || 1,
      sampleCount: descriptor.sampleCount || 1,
      arrayLength: descriptor.arrayLength || 1,
      depth: descriptor.depth || 1,
    };
  }

  async loadTextureFromURL(url: string): Promise<Texture> {
    if (!this.gl) throw new Error("WebGL not available");

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const texture = this.gl!.createTexture();
          if (!texture) throw new Error("Failed to create texture");

          this.gl!.bindTexture(this.gl!.TEXTURE_2D, texture);
          this.gl!.texImage2D(
            this.gl!.TEXTURE_2D,
            0,
            this.gl!.RGBA,
            this.gl!.RGBA,
            this.gl!.UNSIGNED_BYTE,
            image
          );
          this.gl!.generateMipmap(this.gl!.TEXTURE_2D);

          const textureId = Math.random().toString(36).substr(2, 9);
          this.textures.set(textureId, texture);

          resolve({
            id: textureId,
            width: image.width,
            height: image.height,
            pixelFormat: "RGBA8Unorm",
            mipmapLevelCount: 1,
            sampleCount: 1,
            arrayLength: 1,
            depth: 1,
          });
        } catch (e) {
          reject(e);
        }
      };
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = url;
    });
  }

  async loadTextureFromData(
    data: ArrayBuffer,
    descriptor: TextureDescriptor
  ): Promise<Texture> {
    if (!this.gl) throw new Error("WebGL not available");

    const texture = this.gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.parsePixelFormat(descriptor.pixelFormat),
      descriptor.width,
      descriptor.height,
      0,
      this.parsePixelFormat(descriptor.pixelFormat),
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(data)
    );

    const textureId = Math.random().toString(36).substr(2, 9);
    this.textures.set(textureId, texture);

    return {
      id: textureId,
      width: descriptor.width,
      height: descriptor.height,
      pixelFormat: descriptor.pixelFormat,
      mipmapLevelCount: descriptor.mipmapLevelCount || 1,
      sampleCount: descriptor.sampleCount || 1,
      arrayLength: descriptor.arrayLength || 1,
      depth: descriptor.depth || 1,
    };
  }

  async updateTexture(
    textureId: string,
    data: ArrayBuffer,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    if (!this.gl) throw new Error("WebGL not available");

    const texture = this.textures.get(textureId);
    if (!texture) throw new Error("Texture not found");

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      region.x,
      region.y,
      region.width,
      region.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(data)
    );
  }

  async generateMipmaps(textureId: string): Promise<void> {
    if (!this.gl) throw new Error("WebGL not available");

    const texture = this.textures.get(textureId);
    if (!texture) throw new Error("Texture not found");

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  }

  async releaseTexture(textureId: string): Promise<void> {
    const texture = this.textures.get(textureId);
    if (texture && this.gl) {
      this.gl.deleteTexture(texture);
      this.textures.delete(textureId);
    }
  }

  // Buffer Management
  async createBuffer(descriptor: BufferDescriptor): Promise<Buffer> {
    if (!this.gl) throw new Error("WebGL not available");

    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer");

    const bufferId = Math.random().toString(36).substr(2, 9);
    this.buffers.set(bufferId, buffer);

    return {
      id: bufferId,
      length: descriptor.length,
    };
  }

  async createBufferWithData(
    data: ArrayBuffer,
    options?: string
  ): Promise<Buffer> {
    if (!this.gl) throw new Error("WebGL not available");

    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer");

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

    const bufferId = Math.random().toString(36).substr(2, 9);
    this.buffers.set(bufferId, buffer);

    return {
      id: bufferId,
      length: data.byteLength,
    };
  }

  async updateBuffer(
    bufferId: string,
    data: ArrayBuffer,
    offset?: number
  ): Promise<void> {
    if (!this.gl) throw new Error("WebGL not available");

    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error("Buffer not found");

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset || 0, data);
  }

  async getBufferContents(bufferId: string): Promise<ArrayBuffer> {
    if (!this.gl) throw new Error("WebGL not available");

    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error("Buffer not found");

    // WebGL doesn't support reading buffer contents directly
    // This would need to be implemented with a different approach
    return new ArrayBuffer(0);
  }

  async releaseBuffer(bufferId: string): Promise<void> {
    const buffer = this.buffers.get(bufferId);
    if (buffer && this.gl) {
      this.gl.deleteBuffer(buffer);
      this.buffers.delete(bufferId);
    }
  }

  // Shader Management
  async createShaderLibrary(source: string): Promise<string> {
    const libraryId = Math.random().toString(36).substr(2, 9);
    return libraryId;
  }

  async createRenderPipelineState(
    descriptor: ShaderDescriptor
  ): Promise<RenderPipelineState> {
    if (!this.gl) throw new Error("WebGL not available");

    const program = this.gl.createProgram();
    if (!program) throw new Error("Failed to create program");

    const vertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      this.getDefaultVertexShader()
    );
    const fragmentShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.getDefaultFragmentShader()
    );

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    const pipelineId = Math.random().toString(36).substr(2, 9);
    this.programs.set(pipelineId, program);

    return {
      id: pipelineId,
      vertexFunction: descriptor.vertexFunction || "",
      fragmentFunction: descriptor.fragmentFunction || "",
      colorAttachments: descriptor.colorAttachments || [],
      depthAttachmentPixelFormat: descriptor.depthAttachmentPixelFormat,
      stencilAttachmentPixelFormat: descriptor.stencilAttachmentPixelFormat,
      sampleCount: descriptor.sampleCount || 1,
      rasterSampleCount: descriptor.rasterSampleCount || 1,
      alphaToCoverageEnabled: descriptor.alphaToCoverageEnabled || false,
      alphaToOneEnabled: descriptor.alphaToOneEnabled || false,
      rasterizationEnabled: descriptor.rasterizationEnabled !== false,
    };
  }

  async createComputePipelineState(computeFunction: string): Promise<string> {
    const pipelineId = Math.random().toString(36).substr(2, 9);
    return pipelineId;
  }

  async releaseRenderPipelineState(pipelineId: string): Promise<void> {
    const program = this.programs.get(pipelineId);
    if (program && this.gl) {
      this.gl.deleteProgram(program);
      this.programs.delete(pipelineId);
    }
  }

  // Mesh Management
  async createMesh(descriptor: MeshDescriptor): Promise<Mesh> {
    const meshId = Math.random().toString(36).substr(2, 9);
    const mesh = {
      id: meshId,
      vertexBuffers: descriptor.vertexBuffers,
      vertexCount: descriptor.vertexCount,
      primitiveType: descriptor.primitiveType,
      indexBuffer: descriptor.indexBuffer,
      indexCount: descriptor.indexCount,
      indexType: descriptor.indexType,
      submeshes: [],
    };
    this.meshes.set(meshId, mesh);
    return mesh;
  }

  async loadMeshFromURL(url: string): Promise<Mesh> {
    const meshId = Math.random().toString(36).substr(2, 9);
    const mesh = {
      id: meshId,
      vertexBuffers: [],
      vertexCount: 0,
      primitiveType: "Triangle" as const,
      submeshes: [],
    };
    this.meshes.set(meshId, mesh);
    return mesh;
  }

  async loadMeshFromData(
    data: ArrayBuffer,
    format: "obj" | "ply" | "stl"
  ): Promise<Mesh> {
    const meshId = Math.random().toString(36).substr(2, 9);
    const mesh = {
      id: meshId,
      vertexBuffers: [],
      vertexCount: 0,
      primitiveType: "Triangle" as const,
      submeshes: [],
    };
    this.meshes.set(meshId, mesh);
    return mesh;
  }

  async updateMesh(
    meshId: string,
    descriptor: Partial<MeshDescriptor>
  ): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error("Mesh not found");
    // Update mesh properties
  }

  async releaseMesh(meshId: string): Promise<void> {
    this.meshes.delete(meshId);
  }

  // Animation Management
  async createAnimation(descriptor: AnimationDescriptor): Promise<Animation> {
    const animationId = Math.random().toString(36).substr(2, 9);
    const animation = {
      id: animationId,
      duration: descriptor.duration,
      repeatCount: descriptor.repeatCount || 1,
      autoreverses: descriptor.autoreverses || false,
      timingFunction: descriptor.timingFunction || "Default",
      isRunning: false,
      currentTime: 0,
    };
    this.animations.set(animationId, animation);
    return animation;
  }

  async startAnimation(animationId: string): Promise<void> {
    const animation = this.animations.get(animationId);
    if (!animation) throw new Error("Animation not found");
    animation.isRunning = true;
  }

  async pauseAnimation(animationId: string): Promise<void> {
    const animation = this.animations.get(animationId);
    if (!animation) throw new Error("Animation not found");
    animation.isRunning = false;
  }

  async stopAnimation(animationId: string): Promise<void> {
    const animation = this.animations.get(animationId);
    if (!animation) throw new Error("Animation not found");
    animation.isRunning = false;
    animation.currentTime = 0;
  }

  async setAnimationTime(animationId: string, time: number): Promise<void> {
    const animation = this.animations.get(animationId);
    if (!animation) throw new Error("Animation not found");
    animation.currentTime = time;
  }

  async releaseAnimation(animationId: string): Promise<void> {
    this.animations.delete(animationId);
  }

  // Scene Management
  async setScene(scene: SceneDescriptor): Promise<void> {
    // Scene management logic
  }

  async updateCamera(camera: CameraDescriptor): Promise<void> {
    // Camera update logic
  }

  async updateLighting(lighting: LightingDescriptor): Promise<void> {
    // Lighting update logic
  }

  // Rendering Control
  async startRendering(): Promise<void> {
    // Start rendering logic
  }

  async stopRendering(): Promise<void> {
    // Stop rendering logic
  }

  async pauseRendering(): Promise<void> {
    // Pause rendering logic
  }

  async resumeRendering(): Promise<void> {
    // Resume rendering logic
  }

  async setNeedsDisplay(): Promise<void> {
    // Set needs display logic
  }

  // View Configuration
  async setPreferredFramesPerSecond(fps: number): Promise<void> {
    // Set preferred FPS logic
  }

  async setClearColor(
    red: number,
    green: number,
    blue: number,
    alpha: number
  ): Promise<void> {
    // Set clear color logic
  }

  async setDrawableSize(width: number, height: number): Promise<void> {
    // Set drawable size logic
  }

  // Utility Functions
  async takeScreenshot(): Promise<ArrayBuffer> {
    if (!this.gl || !this.canvas) return new ArrayBuffer(0);

    const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
    this.gl.readPixels(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels
    );
    return pixels.buffer;
  }

  async getPerformanceInfo(): Promise<{
    frameTime: number;
    drawCallCount: number;
    triangleCount: number;
  }> {
    return {
      frameTime: 16.67, // 60 FPS
      drawCallCount: 0,
      triangleCount: 0,
    };
  }

  // Helper methods
  private parsePixelFormat(format: string): number {
    if (!this.gl) return 0;

    switch (format) {
      case "RGBA8Unorm":
      case "RGBA8Unorm_sRGB":
        return this.gl.RGBA;
      case "BGRA8Unorm":
      case "BGRA8Unorm_sRGB":
        return this.gl.RGBA;
      case "RGB10A2Unorm":
        return this.gl.RGBA;
      case "RG11B10Float":
        return this.gl.RGB;
      case "RGB9E5Float":
        return this.gl.RGB;
      case "RGBA16Float":
        return this.gl.RGBA;
      case "RGBA32Float":
        return this.gl.RGBA;
      case "Depth32Float":
        return this.gl.DEPTH_COMPONENT;
      case "Depth24Unorm_Stencil8":
        return this.gl.DEPTH_STENCIL;
      case "Depth32Float_Stencil8":
        return this.gl.DEPTH_STENCIL;
      default:
        return this.gl.RGBA;
    }
  }

  private compileShader(type: number, source: string): WebGLShader {
    if (!this.gl) throw new Error("WebGL not available");

    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }

    return shader;
  }

  private getDefaultVertexShader(): string {
    return `
      attribute vec4 position;
      attribute vec4 color;
      varying vec4 vColor;
      uniform mat4 uMVPMatrix;
      
      void main() {
        vColor = color;
        gl_Position = uMVPMatrix * position;
      }
    `;
  }

  private getDefaultFragmentShader(): string {
    return `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        gl_FragColor = vColor;
      }
    `;
  }

  // 2D Drawing Functions
  private canvas2D: Map<string, Canvas2D> = new Map();
  private drawingLayers: Map<string, DrawingLayer[]> = new Map();

  async createCanvas2D(
    width: number,
    height: number,
    pixelFormat: MTLPixelFormat = "RGBA8Unorm"
  ): Promise<Canvas2D> {
    if (!this.gl) throw new Error("WebGL not available");

    const canvasId = Math.random().toString(36).substr(2, 9);
    const texture = await this.createTexture({
      width,
      height,
      pixelFormat,
      usage: "ShaderWrite",
      storageMode: "Private",
    });

    const canvas: Canvas2D = {
      id: canvasId,
      width,
      height,
      pixelFormat,
      texture,
    };

    this.canvas2D.set(canvasId, canvas);
    this.drawingLayers.set(canvasId, []);
    return canvas;
  }

  async clearCanvas2D(
    canvasId: string,
    backgroundColor: Color2D = { red: 0, green: 0, blue: 0, alpha: 1 }
  ): Promise<void> {
    const canvas = this.canvas2D.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // Clear the texture with background color
    const data = new Uint8Array(canvas.width * canvas.height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = backgroundColor.red * 255;
      data[i + 1] = backgroundColor.green * 255;
      data[i + 2] = backgroundColor.blue * 255;
      data[i + 3] = backgroundColor.alpha * 255;
    }

    await this.updateTexture(canvas.texture.id, data.buffer, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }

  async drawLine2D(
    canvasId: string,
    start: Point2D,
    end: Point2D,
    style: LineStyle
  ): Promise<void> {
    // Implementation for drawing lines on 2D canvas
    console.log(
      `Drawing line from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`
    );
  }

  async drawRectangle2D(
    canvasId: string,
    rect: Rectangle2D,
    style: FillStyle | LineStyle
  ): Promise<void> {
    // Implementation for drawing rectangles on 2D canvas
    console.log(
      `Drawing rectangle at (${rect.x}, ${rect.y}) with size ${rect.width}x${rect.height}`
    );
  }

  async drawCircle2D(
    canvasId: string,
    circle: Circle2D,
    style: FillStyle | LineStyle
  ): Promise<void> {
    // Implementation for drawing circles on 2D canvas
    console.log(
      `Drawing circle at (${circle.center.x}, ${circle.center.y}) with radius ${circle.radius}`
    );
  }

  async drawEllipse2D(
    canvasId: string,
    ellipse: Ellipse2D,
    style: FillStyle | LineStyle
  ): Promise<void> {
    // Implementation for drawing ellipses on 2D canvas
    console.log(
      `Drawing ellipse at (${ellipse.center.x}, ${ellipse.center.y}) with radii ${ellipse.radiusX}x${ellipse.radiusY}`
    );
  }

  async drawPath2D(
    canvasId: string,
    path: Path2D,
    style: LineStyle
  ): Promise<void> {
    // Implementation for drawing paths on 2D canvas
    console.log(`Drawing path with ${path.points.length} points`);
  }

  async drawText2D(
    canvasId: string,
    text: string,
    position: Point2D,
    style: TextStyle
  ): Promise<void> {
    // Implementation for drawing text on 2D canvas
    console.log(`Drawing text "${text}" at (${position.x}, ${position.y})`);
  }

  async measureText2D(
    text: string,
    style: TextStyle
  ): Promise<{ width: number; height: number }> {
    // Implementation for measuring text dimensions
    return {
      width: text.length * style.fontSize * 0.6,
      height: style.fontSize,
    };
  }

  async drawImage2D(
    canvasId: string,
    imageTextureId: string,
    destination: Rectangle2D,
    source?: Rectangle2D
  ): Promise<void> {
    // Implementation for drawing images on 2D canvas
    console.log(
      `Drawing image ${imageTextureId} to (${destination.x}, ${destination.y})`
    );
  }

  async compositeCanvas2D(
    canvasId: string,
    sourceCanvasId: string,
    operation: string
  ): Promise<void> {
    // Implementation for canvas compositing
    console.log(
      `Compositing canvas ${sourceCanvasId} onto ${canvasId} with operation ${operation}`
    );
  }

  // 2D Transformations
  async saveCanvas2D(canvasId: string): Promise<void> {
    console.log(`Saving canvas state for ${canvasId}`);
  }

  async restoreCanvas2D(canvasId: string): Promise<void> {
    console.log(`Restoring canvas state for ${canvasId}`);
  }

  async translateCanvas2D(
    canvasId: string,
    x: number,
    y: number
  ): Promise<void> {
    console.log(`Translating canvas ${canvasId} by (${x}, ${y})`);
  }

  async rotateCanvas2D(canvasId: string, angle: number): Promise<void> {
    console.log(`Rotating canvas ${canvasId} by ${angle} radians`);
  }

  async scaleCanvas2D(canvasId: string, x: number, y: number): Promise<void> {
    console.log(`Scaling canvas ${canvasId} by (${x}, ${y})`);
  }

  async setTransformCanvas2D(
    canvasId: string,
    matrix: number[]
  ): Promise<void> {
    console.log(`Setting transform matrix for canvas ${canvasId}`);
  }

  // 2D Layer Management
  async createDrawingLayer(
    canvasId: string,
    name: string
  ): Promise<DrawingLayer> {
    const layerId = Math.random().toString(36).substr(2, 9);
    const layer: DrawingLayer = {
      id: layerId,
      name,
      visible: true,
      opacity: 1.0,
      blendMode: "normal",
      commands: [],
    };

    const layers = this.drawingLayers.get(canvasId) || [];
    layers.push(layer);
    this.drawingLayers.set(canvasId, layers);
    return layer;
  }

  async deleteDrawingLayer(canvasId: string, layerId: string): Promise<void> {
    const layers = this.drawingLayers.get(canvasId) || [];
    const filteredLayers = layers.filter((layer) => layer.id !== layerId);
    this.drawingLayers.set(canvasId, filteredLayers);
  }

  async setActiveLayer(canvasId: string, layerId: string): Promise<void> {
    console.log(`Setting active layer ${layerId} for canvas ${canvasId}`);
  }

  async setLayerOpacity(
    canvasId: string,
    layerId: string,
    opacity: number
  ): Promise<void> {
    const layers = this.drawingLayers.get(canvasId) || [];
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      layer.opacity = opacity;
    }
  }

  async setLayerBlendMode(
    canvasId: string,
    layerId: string,
    blendMode: string
  ): Promise<void> {
    const layers = this.drawingLayers.get(canvasId) || [];
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      layer.blendMode = blendMode;
    }
  }

  async toggleLayerVisibility(
    canvasId: string,
    layerId: string
  ): Promise<void> {
    const layers = this.drawingLayers.get(canvasId) || [];
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  // 2D Brush and Tool Management
  async setBrushStyle(canvasId: string, style: BrushStyle): Promise<void> {
    console.log(`Setting brush style for canvas ${canvasId}`);
  }

  async setLineStyle(canvasId: string, style: LineStyle): Promise<void> {
    console.log(`Setting line style for canvas ${canvasId}`);
  }

  async setFillStyle(canvasId: string, style: FillStyle): Promise<void> {
    console.log(`Setting fill style for canvas ${canvasId}`);
  }

  async setTextStyle(canvasId: string, style: TextStyle): Promise<void> {
    console.log(`Setting text style for canvas ${canvasId}`);
  }

  // 2D Canvas Operations
  async resizeCanvas2D(
    canvasId: string,
    width: number,
    height: number
  ): Promise<void> {
    const canvas = this.canvas2D.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    canvas.width = width;
    canvas.height = height;
    // Recreate texture with new dimensions
    await this.releaseTexture(canvas.texture.id);
    const newTexture = await this.createTexture({
      width,
      height,
      pixelFormat: canvas.pixelFormat,
      usage: "ShaderWrite",
      storageMode: "Private",
    });
    canvas.texture = newTexture;
  }

  async cropCanvas2D(canvasId: string, rect: Rectangle2D): Promise<void> {
    console.log(
      `Cropping canvas ${canvasId} to (${rect.x}, ${rect.y}, ${rect.width}, ${rect.height})`
    );
  }

  async flipCanvas2D(
    canvasId: string,
    horizontal: boolean,
    vertical: boolean
  ): Promise<void> {
    console.log(
      `Flipping canvas ${canvasId} - horizontal: ${horizontal}, vertical: ${vertical}`
    );
  }

  // 2D Export and Import
  async exportCanvas2D(
    canvasId: string,
    format: "png" | "jpg" | "webp"
  ): Promise<ArrayBuffer> {
    const canvas = this.canvas2D.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // For now, return empty buffer - would need actual image encoding
    return new ArrayBuffer(0);
  }

  async importImageToCanvas2D(
    canvasId: string,
    imageData: ArrayBuffer,
    position: Point2D
  ): Promise<void> {
    console.log(
      `Importing image to canvas ${canvasId} at (${position.x}, ${position.y})`
    );
  }

  // 2D Utility Functions
  async getCanvas2DPixel(
    canvasId: string,
    x: number,
    y: number
  ): Promise<Color2D> {
    // Implementation for getting pixel color
    return { red: 0, green: 0, blue: 0, alpha: 1 };
  }

  async setCanvas2DPixel(
    canvasId: string,
    x: number,
    y: number,
    color: Color2D
  ): Promise<void> {
    // Implementation for setting pixel color
    console.log(
      `Setting pixel at (${x}, ${y}) to color (${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`
    );
  }

  async getCanvas2DData(canvasId: string): Promise<ArrayBuffer> {
    const canvas = this.canvas2D.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    return await this.getBufferContents(canvas.texture.id);
  }

  async setCanvas2DData(canvasId: string, data: ArrayBuffer): Promise<void> {
    const canvas = this.canvas2D.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    await this.updateTexture(canvas.texture.id, data, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }
}

export default registerWebModule(MunimMetalkitModule, "MunimMetalkitModule");
