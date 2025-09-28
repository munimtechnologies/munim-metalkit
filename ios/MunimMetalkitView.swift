import ExpoModulesCore
import Metal
import MetalKit
import SceneKit
import UIKit
import simd

public class MunimMetalkitView: ExpoView {
  private var metalView: MTKView?
  private var device: MTLDevice?
  private var commandQueue: MTLCommandQueue?
  private var renderPipelineState: MTLRenderPipelineState?
  private var depthStencilState: MTLDepthStencilState?
  private var scene: SCNScene?
  private var renderer: SCNRenderer?
  
  // Rendering properties
  private var preferredFramesPerSecond: Int = 60
  private var enableSetNeedsDisplay: Bool = true
  private var autoResizeDrawable: Bool = true
  private var drawableSize: CGSize = .zero
  private var colorPixelFormat: MTLPixelFormat = .bgra8Unorm
  private var depthStencilPixelFormat: MTLPixelFormat = .depth32Float
  private var sampleCount: Int = 1
  private var clearColor: MTLClearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1)
  
  // Scene properties
  private var sceneDescriptor: [String: Any]?
  private var cameraDescriptor: [String: Any]?
  private var lightingDescriptor: [String: Any]?
  
  // Performance tracking
  private var frameStartTime: CFTimeInterval = 0
  private var frameCount: Int = 0
  private var drawCallCount: Int = 0
  private var triangleCount: Int = 0
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupMetalView()
  }
  
  private func setupMetalView() {
    guard let device = MTLCreateSystemDefaultDevice() else {
      print("Metal is not supported on this device")
      return
    }
    
    self.device = device
    
    let metalView = MTKView(frame: bounds, device: device)
    metalView.delegate = self
    metalView.preferredFramesPerSecond = preferredFramesPerSecond
    metalView.enableSetNeedsDisplay = enableSetNeedsDisplay
    metalView.autoResizeDrawable = autoResizeDrawable
    metalView.colorPixelFormat = colorPixelFormat
    metalView.depthStencilPixelFormat = depthStencilPixelFormat
    metalView.sampleCount = sampleCount
    metalView.clearColor = clearColor
    metalView.framebufferOnly = false
    
    self.metalView = metalView
    addSubview(metalView)
    
    setupMetal()
    setupSceneKit()
  }
  
  private func setupMetal() {
    guard let device = device else { return }
    
    commandQueue = device.makeCommandQueue()
    
    // Create render pipeline state
    let library = device.makeDefaultLibrary()
    let vertexFunction = library?.makeFunction(name: "vertex_main")
    let fragmentFunction = library?.makeFunction(name: "fragment_main")
    
    let pipelineDescriptor = MTLRenderPipelineDescriptor()
    pipelineDescriptor.vertexFunction = vertexFunction
    pipelineDescriptor.fragmentFunction = fragmentFunction
    pipelineDescriptor.colorAttachments[0].pixelFormat = colorPixelFormat
    pipelineDescriptor.depthAttachmentPixelFormat = depthStencilPixelFormat
    pipelineDescriptor.sampleCount = sampleCount
    
    do {
      renderPipelineState = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
    } catch {
      print("Failed to create render pipeline state: \(error)")
    }
    
    // Create depth stencil state
    let depthStencilDescriptor = MTLDepthStencilDescriptor()
    depthStencilDescriptor.depthCompareFunction = .less
    depthStencilDescriptor.isDepthWriteEnabled = true
    depthStencilState = device.makeDepthStencilState(descriptor: depthStencilDescriptor)
  }
  
  private func setupSceneKit() {
    guard let device = device else { return }
    
    scene = SCNScene()
    renderer = SCNRenderer(device: device, options: nil)
    renderer?.scene = scene
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    metalView?.frame = bounds
    
    if autoResizeDrawable && !drawableSize.equalTo(.zero) {
      metalView?.drawableSize = drawableSize
    }
  }
  
  // MARK: - Property Setters
  
  func setPreferredFramesPerSecond(_ fps: Int) {
    preferredFramesPerSecond = fps
    metalView?.preferredFramesPerSecond = fps
  }
  
  func setEnableSetNeedsDisplay(_ enabled: Bool) {
    enableSetNeedsDisplay = enabled
    metalView?.enableSetNeedsDisplay = enabled
  }
  
  func setAutoResizeDrawable(_ autoResize: Bool) {
    autoResizeDrawable = autoResize
    metalView?.autoResizeDrawable = autoResize
  }
  
  func setDrawableSize(_ size: CGSize) {
    drawableSize = size
    metalView?.drawableSize = size
  }
  
  func setColorPixelFormat(_ format: MTLPixelFormat) {
    colorPixelFormat = format
    metalView?.colorPixelFormat = format
  }
  
  func setDepthStencilPixelFormat(_ format: MTLPixelFormat) {
    depthStencilPixelFormat = format
    metalView?.depthStencilPixelFormat = format
  }
  
  func setSampleCount(_ count: Int) {
    sampleCount = count
    metalView?.sampleCount = count
  }
  
  func setClearColor(_ color: MTLClearColor) {
    clearColor = color
    metalView?.clearColor = color
  }
  
  func setScene(_ scene: [String: Any]) {
    sceneDescriptor = scene
    // Process scene data and update SceneKit scene
    processSceneData(scene)
  }
  
  func setCamera(_ camera: [String: Any]) {
    cameraDescriptor = camera
    // Update camera based on descriptor
    updateCamera(camera)
  }
  
  func setLighting(_ lighting: [String: Any]) {
    lightingDescriptor = lighting
    // Update lighting based on descriptor
    updateLighting(lighting)
  }
  
  // MARK: - Scene Processing
  
  private func processSceneData(_ sceneData: [String: Any]) {
    guard let scene = scene else { return }
    
    // Clear existing scene
    scene.rootNode.childNodes.forEach { $0.removeFromParentNode() }
    
    // Process meshes
    if let meshes = sceneData["meshes"] as? [[String: Any]] {
      for meshData in meshes {
        createMeshNode(from: meshData)
      }
    }
    
    // Process materials
    if let materials = sceneData["materials"] as? [[String: Any]] {
      for materialData in materials {
        createMaterial(from: materialData)
      }
    }
    
    // Process animations
    if let animations = sceneData["animations"] as? [[String: Any]] {
      for animationData in animations {
        createAnimation(from: animationData)
      }
    }
    
    // Set ambient light
    if let ambientColor = sceneData["ambientLightColor"] as? [String: Any] {
      let light = SCNLight()
      light.type = .ambient
      light.color = UIColor(
        red: ambientColor["red"] as? CGFloat ?? 0.2,
        green: ambientColor["green"] as? CGFloat ?? 0.2,
        blue: ambientColor["blue"] as? CGFloat ?? 0.2,
        alpha: ambientColor["alpha"] as? CGFloat ?? 1.0
      )
      
      let lightNode = SCNNode()
      lightNode.light = light
      scene.rootNode.addChildNode(lightNode)
    }
    
    // Set directional light
    if let directionalColor = sceneData["directionalLightColor"] as? [String: Any],
       let direction = sceneData["directionalLightDirection"] as? [String: Any] {
      let light = SCNLight()
      light.type = .directional
      light.color = UIColor(
        red: directionalColor["red"] as? CGFloat ?? 1.0,
        green: directionalColor["green"] as? CGFloat ?? 1.0,
        blue: directionalColor["blue"] as? CGFloat ?? 1.0,
        alpha: directionalColor["alpha"] as? CGFloat ?? 1.0
      )
      
      let lightNode = SCNNode()
      lightNode.light = light
      lightNode.position = SCNVector3(
        direction["x"] as? Float ?? 0,
        direction["y"] as? Float ?? 1,
        direction["z"] as? Float ?? 0
      )
      scene.rootNode.addChildNode(lightNode)
    }
  }
  
  private func createMeshNode(from meshData: [String: Any]) {
    guard let scene = scene else { return }
    
    let geometry = SCNBox(width: 1, height: 1, length: 1, chamferRadius: 0)
    let material = SCNMaterial()
    material.diffuse.contents = UIColor.blue
    geometry.materials = [material]
    
    let node = SCNNode(geometry: geometry)
    scene.rootNode.addChildNode(node)
  }
  
  private func createMaterial(from materialData: [String: Any]) {
    // Material creation logic would go here
  }
  
  private func createAnimation(from animationData: [String: Any]) {
    // Animation creation logic would go here
  }
  
  private func updateCamera(_ cameraData: [String: Any]) {
    // Camera update logic would go here
  }
  
  private func updateLighting(_ lightingData: [String: Any]) {
    // Lighting update logic would go here
  }
  
  // MARK: - Rendering Control
  
  func startRendering() {
    metalView?.isPaused = false
  }
  
  func stopRendering() {
    metalView?.isPaused = true
  }
  
  func pauseRendering() {
    metalView?.isPaused = true
  }
  
  func resumeRendering() {
    metalView?.isPaused = false
  }
  
  func setNeedsDisplay() {
    metalView?.setNeedsDisplay()
  }
  
  // MARK: - Performance Monitoring
  
  private func updatePerformanceMetrics() {
    frameCount += 1
    
    // Send performance event
    sendEvent("onRender", [
      "frameTime": CACurrentMediaTime() - frameStartTime,
      "drawableCount": frameCount
    ])
  }
}

// MARK: - MTKViewDelegate

extension MunimMetalkitView: MTKViewDelegate {
  public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
    // Handle drawable size change
  }
  
  public func draw(in view: MTKView) {
    frameStartTime = CACurrentMediaTime()
    
    guard let device = device,
          let commandQueue = commandQueue,
          let renderPassDescriptor = view.currentRenderPassDescriptor,
          let commandBuffer = commandQueue.makeCommandBuffer(),
          let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else {
      return
    }
    
    // Set render pipeline state
    if let renderPipelineState = renderPipelineState {
      renderEncoder.setRenderPipelineState(renderPipelineState)
    }
    
    // Set depth stencil state
    if let depthStencilState = depthStencilState {
      renderEncoder.setDepthStencilState(depthStencilState)
    }
    
    // Render SceneKit scene
    if let renderer = renderer {
      renderer.render(atTime: CACurrentMediaTime())
    }
    
    // Draw basic geometry if no scene
    if scene?.rootNode.childNodes.isEmpty ?? true {
      drawBasicGeometry(renderEncoder: renderEncoder)
    }
    
    renderEncoder.endEncoding()
    
    if let drawable = view.currentDrawable {
      commandBuffer.present(drawable)
    }
    
    commandBuffer.commit()
    
    updatePerformanceMetrics()
  }
  
  private func drawBasicGeometry(renderEncoder: MTLRenderCommandEncoder) {
    // Draw a simple triangle or cube
    // This would be implemented with actual vertex data
  }
}