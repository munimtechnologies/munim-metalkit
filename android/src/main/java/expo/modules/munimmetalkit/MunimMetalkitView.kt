package expo.modules.munimmetalkit

import android.content.Context
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import expo.modules.kotlin.views.ExpoView
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class MunimMetalkitView(context: Context) : ExpoView(context) {
  private var glSurfaceView: GLSurfaceView? = null
  private var renderer: MetalRenderer? = null
  
  // Rendering properties
  private var preferredFramesPerSecond: Int = 60
  private var enableSetNeedsDisplay: Boolean = true
  private var autoResizeDrawable: Boolean = true
  private var drawableWidth: Int = 0
  private var drawableHeight: Int = 0
  private var colorPixelFormat: String = "BGRA8Unorm"
  private var depthStencilPixelFormat: String = "Depth32Float"
  private var sampleCount: Int = 1
  private var clearColorRed: Float = 0.0f
  private var clearColorGreen: Float = 0.0f
  private var clearColorBlue: Float = 0.0f
  private var clearColorAlpha: Float = 1.0f
  
  // Scene properties
  private var sceneDescriptor: Map<String, Any>? = null
  private var cameraDescriptor: Map<String, Any>? = null
  private var lightingDescriptor: Map<String, Any>? = null
  
  init {
    setupGLSurfaceView()
  }
  
  private fun setupGLSurfaceView() {
    glSurfaceView = GLSurfaceView(context).apply {
      setEGLContextClientVersion(2)
      setEGLConfigChooser(8, 8, 8, 8, 16, 0)
      
      renderer = MetalRenderer().apply {
        setOnRenderCallback { frameTime, drawableCount ->
          // Send render event
        }
      }
      
      setRenderer(renderer)
      renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
    }
    
    addView(glSurfaceView)
  }
  
  // Property setters
  fun setPreferredFramesPerSecond(fps: Int) {
    preferredFramesPerSecond = fps
    glSurfaceView?.renderMode = if (fps > 0) GLSurfaceView.RENDERMODE_CONTINUOUSLY else GLSurfaceView.RENDERMODE_WHEN_DIRTY
  }
  
  fun setEnableSetNeedsDisplay(enabled: Boolean) {
    enableSetNeedsDisplay = enabled
  }
  
  fun setAutoResizeDrawable(autoResize: Boolean) {
    autoResizeDrawable = autoResize
  }
  
  fun setDrawableSize(width: Int, height: Int) {
    drawableWidth = width
    drawableHeight = height
    if (autoResizeDrawable) {
      glSurfaceView?.layoutParams = glSurfaceView?.layoutParams?.apply {
        this.width = width
        this.height = height
      }
    }
  }
  
  fun setColorPixelFormat(format: String) {
    colorPixelFormat = format
  }
  
  fun setDepthStencilPixelFormat(format: String) {
    depthStencilPixelFormat = format
  }
  
  fun setSampleCount(count: Int) {
    sampleCount = count
  }
  
  fun setClearColor(red: Double, green: Double, blue: Double, alpha: Double) {
    clearColorRed = red.toFloat()
    clearColorGreen = green.toFloat()
    clearColorBlue = blue.toFloat()
    clearColorAlpha = alpha.toFloat()
  }
  
  fun setScene(scene: Map<String, Any>) {
    sceneDescriptor = scene
    renderer?.setScene(scene)
  }
  
  fun setCamera(camera: Map<String, Any>) {
    cameraDescriptor = camera
    renderer?.setCamera(camera)
  }
  
  fun setLighting(lighting: Map<String, Any>) {
    lightingDescriptor = lighting
    renderer?.setLighting(lighting)
  }
  
  // Rendering control
  fun startRendering() {
    glSurfaceView?.onResume()
  }
  
  fun stopRendering() {
    glSurfaceView?.onPause()
  }
  
  fun pauseRendering() {
    glSurfaceView?.onPause()
  }
  
  fun resumeRendering() {
    glSurfaceView?.onResume()
  }
  
  fun setNeedsDisplay() {
    glSurfaceView?.requestRender()
  }
  
  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (autoResizeDrawable) {
      setDrawableSize(w, h)
    }
  }
}

class MetalRenderer : GLSurfaceView.Renderer {
  private var onRenderCallback: ((Double, Int) -> Unit)? = null
  private var frameStartTime: Long = 0
  private var frameCount: Int = 0
  
  // OpenGL state
  private var program: Int = 0
  private var positionHandle: Int = 0
  private var colorHandle: Int = 0
  private var mvpMatrixHandle: Int = 0
  
  // Matrices
  private val mvpMatrix = FloatArray(16)
  private val projectionMatrix = FloatArray(16)
  private val viewMatrix = FloatArray(16)
  private val modelMatrix = FloatArray(16)
  
  // Scene data
  private var sceneDescriptor: Map<String, Any>? = null
  private var cameraDescriptor: Map<String, Any>? = null
  private var lightingDescriptor: Map<String, Any>? = null
  
  override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
    GLES20.glClearColor(0.0f, 0.0f, 0.0f, 1.0f)
    GLES20.glEnable(GLES20.GL_DEPTH_TEST)
    
    setupShaders()
  }
  
  override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
    GLES20.glViewport(0, 0, width, height)
    
    val ratio = width.toFloat() / height.toFloat()
    Matrix.frustumM(projectionMatrix, 0, -ratio, ratio, -1f, 1f, 3f, 7f)
  }
  
  override fun onDrawFrame(gl: GL10?) {
    frameStartTime = System.nanoTime()
    
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
    
    // Set up matrices
    Matrix.setLookAtM(viewMatrix, 0, 0f, 0f, -3f, 0f, 0f, 0f, 0f, 1f, 0f)
    Matrix.multiplyMM(mvpMatrix, 0, projectionMatrix, 0, viewMatrix, 0)
    
    // Use shader program
    GLES20.glUseProgram(program)
    
    // Set uniforms
    GLES20.glUniformMatrix4fv(mvpMatrixHandle, 1, false, mvpMatrix, 0)
    
    // Draw basic geometry
    drawBasicGeometry()
    
    frameCount++
    
    // Send render event
    val frameTime = (System.nanoTime() - frameStartTime) / 1_000_000.0 // Convert to milliseconds
    onRenderCallback?.invoke(frameTime, frameCount)
  }
  
  private fun setupShaders() {
    val vertexShaderCode = """
      attribute vec4 position;
      attribute vec4 color;
      varying vec4 vColor;
      uniform mat4 uMVPMatrix;
      
      void main() {
        vColor = color;
        gl_Position = uMVPMatrix * position;
      }
    """.trimIndent()
    
    val fragmentShaderCode = """
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        gl_FragColor = vColor;
      }
    """.trimIndent()
    
    val vertexShader = loadShader(GLES20.GL_VERTEX_SHADER, vertexShaderCode)
    val fragmentShader = loadShader(GLES20.GL_FRAGMENT_SHADER, fragmentShaderCode)
    
    program = GLES20.glCreateProgram()
    GLES20.glAttachShader(program, vertexShader)
    GLES20.glAttachShader(program, fragmentShader)
    GLES20.glLinkProgram(program)
    
    // Get handles
    positionHandle = GLES20.glGetAttribLocation(program, "position")
    colorHandle = GLES20.glGetAttribLocation(program, "color")
    mvpMatrixHandle = GLES20.glGetUniformLocation(program, "uMVPMatrix")
  }
  
  private fun loadShader(type: Int, shaderCode: String): Int {
    val shader = GLES20.glCreateShader(type)
    GLES20.glShaderSource(shader, shaderCode)
    GLES20.glCompileShader(shader)
    return shader
  }
  
  private fun drawBasicGeometry() {
    // Draw a simple triangle
    val triangleVertices = floatArrayOf(
      0.0f, 0.5f, 0.0f,  // Top
      -0.5f, -0.5f, 0.0f, // Bottom left
      0.5f, -0.5f, 0.0f   // Bottom right
    )
    
    val triangleColors = floatArrayOf(
      1.0f, 0.0f, 0.0f, 1.0f, // Red
      0.0f, 1.0f, 0.0f, 1.0f, // Green
      0.0f, 0.0f, 1.0f, 1.0f  // Blue
    )
    
    val vertexBuffer = java.nio.FloatBuffer.allocate(triangleVertices.size)
    vertexBuffer.put(triangleVertices)
    vertexBuffer.position(0)
    
    val colorBuffer = java.nio.FloatBuffer.allocate(triangleColors.size)
    colorBuffer.put(triangleColors)
    colorBuffer.position(0)
    
    GLES20.glEnableVertexAttribArray(positionHandle)
    GLES20.glVertexAttribPointer(positionHandle, 3, GLES20.GL_FLOAT, false, 0, vertexBuffer)
    
    GLES20.glEnableVertexAttribArray(colorHandle)
    GLES20.glVertexAttribPointer(colorHandle, 4, GLES20.GL_FLOAT, false, 0, colorBuffer)
    
    GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 3)
    
    GLES20.glDisableVertexAttribArray(positionHandle)
    GLES20.glDisableVertexAttribArray(colorHandle)
  }
  
  fun setOnRenderCallback(callback: (Double, Int) -> Unit) {
    onRenderCallback = callback
  }
  
  fun setScene(scene: Map<String, Any>) {
    sceneDescriptor = scene
    // Process scene data
  }
  
  fun setCamera(camera: Map<String, Any>) {
    cameraDescriptor = camera
    // Update camera
  }
  
  fun setLighting(lighting: Map<String, Any>) {
    lightingDescriptor = lighting
    // Update lighting
  }
}