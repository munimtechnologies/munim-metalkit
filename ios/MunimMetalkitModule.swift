import ExpoModulesCore
import Metal
import MetalKit
import ModelIO
import SceneKit
import UIKit
import simd

public class MunimMetalkitModule: Module {
  private var device: MTLDevice?
  private var commandQueue: MTLCommandQueue?
  private var textureLoader: MTKTextureLoader?
  private var meshBufferAllocator: MDLMeshBufferAllocator?
  private var asset: MDLAsset?
  private var scene: SCNScene?
  private var renderer: SCNRenderer?
  
  private var textures: [String: MTLTexture] = [:]
  private var buffers: [String: MTLBuffer] = [:]
  private var renderPipelineStates: [String: MTLRenderPipelineState] = [:]
  private var meshes: [String: MDLMesh] = [:]
  private var animations: [String: CAAnimation] = [:]
  
  public func definition() -> ModuleDefinition {
    Name("MunimMetalkit")

    // Constants
    Constant("PI") {
      Double.pi
    }

    // Events
    Events("onChange", "onRender", "onError", "onAnimationComplete")

    // Basic functions
    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    // Device and Context
    Function("isMetalAvailable") {
      return MTLCreateSystemDefaultDevice() != nil
    }

    AsyncFunction("getDeviceInfo") { () -> [String: Any] in
      guard let device = MTLCreateSystemDefaultDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      return [
        "name": device.name,
        "maxThreadsPerGroup": device.maxThreadsPerThreadgroup.width,
        "maxThreadgroupMemoryLength": device.maxThreadgroupMemoryLength
      ]
    }

    // Texture Management
    AsyncFunction("createTexture") { (descriptor: [String: Any]) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let textureDescriptor = MTLTextureDescriptor()
      textureDescriptor.width = descriptor["width"] as? Int ?? 0
      textureDescriptor.height = descriptor["height"] as? Int ?? 0
      textureDescriptor.pixelFormat = self.parsePixelFormat(descriptor["pixelFormat"] as? String ?? "BGRA8Unorm")
      textureDescriptor.usage = self.parseTextureUsage(descriptor["usage"] as? String ?? "ShaderRead")
      textureDescriptor.mipmapLevelCount = descriptor["mipmapLevelCount"] as? Int ?? 1
      textureDescriptor.sampleCount = descriptor["sampleCount"] as? Int ?? 1
      textureDescriptor.arrayLength = descriptor["arrayLength"] as? Int ?? 1
      textureDescriptor.depth = descriptor["depth"] as? Int ?? 1
      textureDescriptor.storageMode = self.parseStorageMode(descriptor["storageMode"] as? String ?? "Private")
      
      guard let texture = device.makeTexture(descriptor: textureDescriptor) else {
        throw MetalError.textureCreationFailed
      }
      
      let textureId = UUID().uuidString
      self.textures[textureId] = texture
      
      return [
        "id": textureId,
        "width": texture.width,
        "height": texture.height,
        "pixelFormat": self.pixelFormatToString(texture.pixelFormat),
        "mipmapLevelCount": texture.mipmapLevelCount,
        "sampleCount": texture.sampleCount,
        "arrayLength": texture.arrayLength,
        "depth": texture.depth
      ]
    }

    AsyncFunction("loadTextureFromURL") { (url: String) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let textureLoader = MTKTextureLoader(device: device)
      guard let imageURL = URL(string: url) else {
        throw MetalError.invalidURL
      }
      
      let texture = try textureLoader.newTexture(URL: imageURL, options: nil)
      let textureId = UUID().uuidString
      self.textures[textureId] = texture
      
      return [
        "id": textureId,
        "width": texture.width,
        "height": texture.height,
        "pixelFormat": self.pixelFormatToString(texture.pixelFormat),
        "mipmapLevelCount": texture.mipmapLevelCount,
        "sampleCount": texture.sampleCount,
        "arrayLength": texture.arrayLength,
        "depth": texture.depth
      ]
    }

    AsyncFunction("loadTextureFromData") { (data: [UInt8], descriptor: [String: Any]) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let textureLoader = MTKTextureLoader(device: device)
      let data = Data(data)
      
      let texture = try textureLoader.newTexture(data: data, options: nil)
      let textureId = UUID().uuidString
      self.textures[textureId] = texture
      
      return [
        "id": textureId,
        "width": texture.width,
        "height": texture.height,
        "pixelFormat": self.pixelFormatToString(texture.pixelFormat),
        "mipmapLevelCount": texture.mipmapLevelCount,
        "sampleCount": texture.sampleCount,
        "arrayLength": texture.arrayLength,
        "depth": texture.depth
      ]
    }

    AsyncFunction("updateTexture") { (textureId: String, data: [UInt8], region: [String: Any]) in
      guard let texture = self.textures[textureId] else {
        throw MetalError.textureNotFound
      }
      
      let region = MTLRegion(
        origin: MTLOrigin(
          x: region["x"] as? Int ?? 0,
          y: region["y"] as? Int ?? 0,
          z: region["z"] as? Int ?? 0
        ),
        size: MTLSize(
          width: region["width"] as? Int ?? 0,
          height: region["height"] as? Int ?? 0,
          depth: region["depth"] as? Int ?? 1
        )
      )
      
      let bytesPerPixel = 4 // Assuming RGBA
      let bytesPerRow = region.width * bytesPerPixel
      let data = Data(data)
      
      texture.replace(region: region, mipmapLevel: 0, withBytes: data.withUnsafeBytes { $0.baseAddress! }, bytesPerRow: bytesPerRow)
    }

    AsyncFunction("generateMipmaps") { (textureId: String) in
      guard let texture = self.textures[textureId] else {
        throw MetalError.textureNotFound
      }
      
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let commandQueue = device.makeCommandQueue()!
      let commandBuffer = commandQueue.makeCommandBuffer()!
      let blitEncoder = commandBuffer.makeBlitCommandEncoder()!
      
      blitEncoder.generateMipmaps(for: texture)
      blitEncoder.endEncoding()
      commandBuffer.commit()
      commandBuffer.waitUntilCompleted()
    }

    AsyncFunction("releaseTexture") { (textureId: String) in
      self.textures.removeValue(forKey: textureId)
    }

    // Buffer Management
    AsyncFunction("createBuffer") { (descriptor: [String: Any]) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let length = descriptor["length"] as? Int ?? 0
      let options = self.parseResourceOptions(descriptor["options"] as? String ?? "StorageModePrivate")
      
      guard let buffer = device.makeBuffer(length: length, options: options) else {
        throw MetalError.bufferCreationFailed
      }
      
      let bufferId = UUID().uuidString
      self.buffers[bufferId] = buffer
      
      return [
        "id": bufferId,
        "length": buffer.length
      ]
    }

    AsyncFunction("createBufferWithData") { (data: [UInt8], options: String?) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let data = Data(data)
      let resourceOptions = self.parseResourceOptions(options ?? "StorageModePrivate")
      
      guard let buffer = device.makeBuffer(bytes: data.withUnsafeBytes { $0.baseAddress! }, length: data.count, options: resourceOptions) else {
        throw MetalError.bufferCreationFailed
      }
      
      let bufferId = UUID().uuidString
      self.buffers[bufferId] = buffer
      
      return [
        "id": bufferId,
        "length": buffer.length
      ]
    }

    AsyncFunction("updateBuffer") { (bufferId: String, data: [UInt8], offset: Int?) in
      guard let buffer = self.buffers[bufferId] else {
        throw MetalError.bufferNotFound
      }
      
      let data = Data(data)
      let offset = offset ?? 0
      
      memcpy(buffer.contents().advanced(by: offset), data.withUnsafeBytes { $0.baseAddress! }, data.count)
    }

    AsyncFunction("getBufferContents") { (bufferId: String) -> [UInt8] in
      guard let buffer = self.buffers[bufferId] else {
        throw MetalError.bufferNotFound
      }
      
      return Array(UnsafeBufferPointer(start: buffer.contents().assumingMemoryBound(to: UInt8.self), count: buffer.length))
    }

    AsyncFunction("releaseBuffer") { (bufferId: String) in
      self.buffers.removeValue(forKey: bufferId)
    }

    // Shader Management
    AsyncFunction("createShaderLibrary") { (source: String) -> String in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      do {
        let library = try device.makeLibrary(source: source, options: nil)
        let libraryId = UUID().uuidString
        return libraryId
      } catch {
        throw MetalError.shaderCompilationFailed
      }
    }

    AsyncFunction("createRenderPipelineState") { (descriptor: [String: Any]) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let pipelineDescriptor = MTLRenderPipelineDescriptor()
      
      // Configure color attachments
      if let colorAttachments = descriptor["colorAttachments"] as? [[String: Any]] {
        for (index, attachment) in colorAttachments.enumerated() {
          if index < pipelineDescriptor.colorAttachments.count {
            let colorAttachment = pipelineDescriptor.colorAttachments[index]
            colorAttachment?.pixelFormat = self.parsePixelFormat(attachment["pixelFormat"] as? String ?? "BGRA8Unorm")
            colorAttachment?.isBlendingEnabled = attachment["isBlendingEnabled"] as? Bool ?? false
          }
        }
      }
      
      // Set depth and stencil pixel formats
      if let depthFormat = descriptor["depthAttachmentPixelFormat"] as? String {
        pipelineDescriptor.depthAttachmentPixelFormat = self.parsePixelFormat(depthFormat)
      }
      
      if let stencilFormat = descriptor["stencilAttachmentPixelFormat"] as? String {
        pipelineDescriptor.stencilAttachmentPixelFormat = self.parsePixelFormat(stencilFormat)
      }
      
      pipelineDescriptor.sampleCount = descriptor["sampleCount"] as? Int ?? 1
      pipelineDescriptor.rasterSampleCount = descriptor["rasterSampleCount"] as? Int ?? 1
      pipelineDescriptor.isAlphaToCoverageEnabled = descriptor["alphaToCoverageEnabled"] as? Bool ?? false
      pipelineDescriptor.isAlphaToOneEnabled = descriptor["alphaToOneEnabled"] as? Bool ?? false
      pipelineDescriptor.isRasterizationEnabled = descriptor["rasterizationEnabled"] as? Bool ?? true
      
      do {
        let pipelineState = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
        let pipelineId = UUID().uuidString
        self.renderPipelineStates[pipelineId] = pipelineState
        
        return [
          "id": pipelineId,
          "vertexFunction": descriptor["vertexFunction"] as? String ?? "",
          "fragmentFunction": descriptor["fragmentFunction"] as? String ?? "",
          "sampleCount": pipelineDescriptor.sampleCount,
          "rasterSampleCount": pipelineDescriptor.rasterSampleCount,
          "alphaToCoverageEnabled": pipelineDescriptor.isAlphaToCoverageEnabled,
          "alphaToOneEnabled": pipelineDescriptor.isAlphaToOneEnabled,
          "rasterizationEnabled": pipelineDescriptor.isRasterizationEnabled
        ]
      } catch {
        throw MetalError.pipelineCreationFailed
      }
    }

    AsyncFunction("createComputePipelineState") { (computeFunction: String) -> String in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let pipelineId = UUID().uuidString
      return pipelineId
    }

    AsyncFunction("releaseRenderPipelineState") { (pipelineId: String) in
      self.renderPipelineStates.removeValue(forKey: pipelineId)
    }

    // Mesh Management
    AsyncFunction("createMesh") { (descriptor: [String: Any]) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let allocator = MDLMeshBufferAllocator(device: device)
      let mesh = MDLMesh(allocator: allocator)
      
      let meshId = UUID().uuidString
      self.meshes[meshId] = mesh
      
      return [
        "id": meshId,
        "vertexCount": mesh.vertexCount,
        "primitiveType": "Triangle"
      ]
    }

    AsyncFunction("loadMeshFromURL") { (url: String) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      guard let assetURL = URL(string: url) else {
        throw MetalError.invalidURL
      }
      
      let allocator = MDLMeshBufferAllocator(device: device)
      let asset = MDLAsset(url: assetURL, vertexDescriptor: nil, bufferAllocator: allocator)
      
      guard let mesh = asset.object(at: 0) as? MDLMesh else {
        throw MetalError.meshLoadFailed
      }
      
      let meshId = UUID().uuidString
      self.meshes[meshId] = mesh
      
      return [
        "id": meshId,
        "vertexCount": mesh.vertexCount,
        "primitiveType": "Triangle"
      ]
    }

    AsyncFunction("loadMeshFromData") { (data: [UInt8], format: String) -> [String: Any] in
      guard let device = self.getDevice() else {
        throw MetalError.deviceNotAvailable
      }
      
      let data = Data(data)
      let allocator = MDLMeshBufferAllocator(device: device)
      
      let mesh = MDLMesh(allocator: allocator)
      let meshId = UUID().uuidString
      self.meshes[meshId] = mesh
      
      return [
        "id": meshId,
        "vertexCount": mesh.vertexCount,
        "primitiveType": "Triangle"
      ]
    }

    AsyncFunction("updateMesh") { (meshId: String, descriptor: [String: Any]) in
      guard let mesh = self.meshes[meshId] else {
        throw MetalError.meshNotFound
      }
      
      // Update mesh properties based on descriptor
    }

    AsyncFunction("releaseMesh") { (meshId: String) in
      self.meshes.removeValue(forKey: meshId)
    }

    // Animation Management
    AsyncFunction("createAnimation") { (descriptor: [String: Any]) -> [String: Any] in
      let duration = descriptor["duration"] as? Double ?? 1.0
      let repeatCount = descriptor["repeatCount"] as? Float ?? 1.0
      let autoreverses = descriptor["autoreverses"] as? Bool ?? false
      let timingFunction = descriptor["timingFunction"] as? String ?? "Default"
      
      let animation = CABasicAnimation(keyPath: "transform")
      animation.duration = duration
      animation.repeatCount = repeatCount
      animation.autoreverses = autoreverses
      
      let animationId = UUID().uuidString
      self.animations[animationId] = animation
      
      return [
        "id": animationId,
        "duration": duration,
        "repeatCount": repeatCount,
        "autoreverses": autoreverses,
        "timingFunction": timingFunction,
        "isRunning": false,
        "currentTime": 0.0
      ]
    }

    AsyncFunction("startAnimation") { (animationId: String) in
      guard let animation = self.animations[animationId] else {
        throw MetalError.animationNotFound
      }
      
      // Start animation logic would go here
    }

    AsyncFunction("pauseAnimation") { (animationId: String) in
      guard let animation = self.animations[animationId] else {
        throw MetalError.animationNotFound
      }
      
      // Pause animation logic would go here
    }

    AsyncFunction("stopAnimation") { (animationId: String) in
      guard let animation = self.animations[animationId] else {
        throw MetalError.animationNotFound
      }
      
      // Stop animation logic would go here
    }

    AsyncFunction("setAnimationTime") { (animationId: String, time: Double) in
      guard let animation = self.animations[animationId] else {
        throw MetalError.animationNotFound
      }
      
      // Set animation time logic would go here
    }

    AsyncFunction("releaseAnimation") { (animationId: String) in
      self.animations.removeValue(forKey: animationId)
    }

    // Scene Management
    AsyncFunction("setScene") { (scene: [String: Any]) in
      // Scene management logic would go here
    }

    AsyncFunction("updateCamera") { (camera: [String: Any]) in
      // Camera update logic would go here
    }

    AsyncFunction("updateLighting") { (lighting: [String: Any]) in
      // Lighting update logic would go here
    }

    // Rendering Control
    AsyncFunction("startRendering") {
      // Start rendering logic would go here
    }

    AsyncFunction("stopRendering") {
      // Stop rendering logic would go here
    }

    AsyncFunction("pauseRendering") {
      // Pause rendering logic would go here
    }

    AsyncFunction("resumeRendering") {
      // Resume rendering logic would go here
    }

    AsyncFunction("setNeedsDisplay") {
      // Set needs display logic would go here
    }

    // View Configuration
    AsyncFunction("setPreferredFramesPerSecond") { (fps: Int) in
      // Set preferred FPS logic would go here
    }

    AsyncFunction("setClearColor") { (red: Double, green: Double, blue: Double, alpha: Double) in
      // Set clear color logic would go here
    }

    AsyncFunction("setDrawableSize") { (width: Int, height: Int) in
      // Set drawable size logic would go here
    }

    // Utility Functions
    AsyncFunction("takeScreenshot") { () -> [UInt8] in
      // Screenshot logic would go here
      return []
    }

    AsyncFunction("getPerformanceInfo") { () -> [String: Any] in
      return [
        "frameTime": 16.67, // 60 FPS
        "drawCallCount": 0,
        "triangleCount": 0
      ]
    }

    // View Definition
    View(MunimMetalkitView.self) {
      // Basic props
      Prop("preferredFramesPerSecond") { (view: MunimMetalkitView, fps: Int) in
        view.preferredFramesPerSecond = fps
      }
      
      Prop("enableSetNeedsDisplay") { (view: MunimMetalkitView, enabled: Bool) in
        view.enableSetNeedsDisplay = enabled
      }
      
      Prop("autoResizeDrawable") { (view: MunimMetalkitView, autoResize: Bool) in
        view.autoResizeDrawable = autoResize
      }
      
      Prop("drawableSize") { (view: MunimMetalkitView, size: [String: Any]) in
        if let width = size["width"] as? Int, let height = size["height"] as? Int {
          view.drawableSize = CGSize(width: width, height: height)
        }
      }
      
      Prop("colorPixelFormat") { (view: MunimMetalkitView, format: String) in
        view.colorPixelFormat = self.parsePixelFormat(format)
      }
      
      Prop("depthStencilPixelFormat") { (view: MunimMetalkitView, format: String) in
        view.depthStencilPixelFormat = self.parsePixelFormat(format)
      }
      
      Prop("sampleCount") { (view: MunimMetalkitView, count: Int) in
        view.sampleCount = count
      }
      
      Prop("clearColor") { (view: MunimMetalkitView, color: [String: Any]) in
        if let red = color["red"] as? Double,
           let green = color["green"] as? Double,
           let blue = color["blue"] as? Double,
           let alpha = color["alpha"] as? Double {
          view.clearColor = MTLClearColor(red: red, green: green, blue: blue, alpha: alpha)
        }
      }
      
      // Scene props
      Prop("scene") { (view: MunimMetalkitView, scene: [String: Any]) in
        // Scene setup logic would go here
      }
      
      Prop("camera") { (view: MunimMetalkitView, camera: [String: Any]) in
        // Camera setup logic would go here
      }
      
      Prop("lighting") { (view: MunimMetalkitView, lighting: [String: Any]) in
        // Lighting setup logic would go here
      }

      Events("onLoad", "onRender", "onError", "onAnimationComplete")
    }
  }
  
  // MARK: - Helper Methods
  
  private func getDevice() -> MTLDevice? {
    if device == nil {
      device = MTLCreateSystemDefaultDevice()
    }
    return device
  }
  
  private func parsePixelFormat(_ format: String) -> MTLPixelFormat {
    switch format {
    case "RGBA8Unorm": return .rgba8Unorm
    case "RGBA8Unorm_sRGB": return .rgba8Unorm_srgb
    case "BGRA8Unorm": return .bgra8Unorm
    case "BGRA8Unorm_sRGB": return .bgra8Unorm_srgb
    case "RGB10A2Unorm": return .rgb10a2Unorm
    case "RG11B10Float": return .rg11b10Float
    case "RGB9E5Float": return .rgb9e5Float
    case "RGBA16Float": return .rgba16Float
    case "RGBA32Float": return .rgba32Float
    case "Depth32Float": return .depth32Float
    case "Depth24Unorm_Stencil8": return .depth32Float_stencil8
    case "Depth32Float_Stencil8": return .depth32Float_stencil8
    default: return .bgra8Unorm
    }
  }
  
  private func pixelFormatToString(_ format: MTLPixelFormat) -> String {
    switch format {
    case .rgba8Unorm: return "RGBA8Unorm"
    case .rgba8Unorm_srgb: return "RGBA8Unorm_sRGB"
    case .bgra8Unorm: return "BGRA8Unorm"
    case .bgra8Unorm_srgb: return "BGRA8Unorm_sRGB"
    case .rgb10a2Unorm: return "RGB10A2Unorm"
    case .rg11b10Float: return "RG11B10Float"
    case .rgb9e5Float: return "RGB9E5Float"
    case .rgba16Float: return "RGBA16Float"
    case .rgba32Float: return "RGBA32Float"
    case .depth32Float: return "Depth32Float"
    case .depth24Unorm_stencil8: return "Depth24Unorm_Stencil8"
    case .depth32Float_stencil8: return "Depth32Float_Stencil8"
    default: return "BGRA8Unorm"
    }
  }
  
  private func parseTextureUsage(_ usage: String) -> MTLTextureUsage {
    switch usage {
    case "ShaderRead": return .shaderRead
    case "ShaderWrite": return .shaderWrite
    case "RenderTarget": return .renderTarget
    case "PixelFormatView": return .pixelFormatView
    default: return .shaderRead
    }
  }
  
  private func parseStorageMode(_ mode: String) -> MTLStorageMode {
    switch mode {
    case "Shared": return .shared
    case "Managed": return .shared
    case "Private": return .private
    default: return .private
    }
  }
  
  private func parseResourceOptions(_ options: String) -> MTLResourceOptions {
    switch options {
    case "CPUCacheModeDefaultCache": return []
    case "CPUCacheModeWriteCombined": return .cpuCacheModeWriteCombined
    case "StorageModeShared": return .storageModeShared
    case "StorageModeManaged": return .storageModeShared
    case "StorageModePrivate": return .storageModePrivate
    default: return .storageModePrivate
    }
  }
}

// MARK: - Error Types

enum MetalError: Error {
  case deviceNotAvailable
  case textureCreationFailed
  case textureNotFound
  case bufferCreationFailed
  case bufferNotFound
  case shaderCompilationFailed
  case pipelineCreationFailed
  case meshLoadFailed
  case meshNotFound
  case animationNotFound
  case invalidURL
}
