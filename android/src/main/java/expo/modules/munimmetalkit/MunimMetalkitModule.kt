package expo.modules.munimmetalkit

import android.content.Context
import android.opengl.GLES20
import android.opengl.GLES30
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.*

class MunimMetalkitModule : Module() {
  private val textures = mutableMapOf<String, Int>()
  private val buffers = mutableMapOf<String, ByteBuffer>()
  private val shaders = mutableMapOf<String, Int>()
  private val programs = mutableMapOf<String, Int>()
  private val meshes = mutableMapOf<String, MeshData>()
  private val animations = mutableMapOf<String, AnimationData>()
  
  private var isOpenGLAvailable = false
  private var maxTextureSize = 0
  private var maxVertexAttribs = 0
  private var maxTextureImageUnits = 0

  override fun definition() = ModuleDefinition {
    Name("MunimMetalkit")

    // Constants
    Constant("PI") {
      Math.PI
    }

    // Events
    Events("onChange", "onRender", "onError", "onAnimationComplete")

    // Basic functions
    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }

    // Device and Context
    Function("isMetalAvailable") {
      isOpenGLAvailable
    }

    AsyncFunction("getDeviceInfo") { promise: Promise ->
      try {
        val context = appContext.currentActivity?.applicationContext
        if (context != null) {
          val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
          val deviceInfo = activityManager.deviceConfigurationInfo
          
          promise.resolve(mapOf(
            "name" to (deviceInfo.glVersion ?: "Unknown"),
            "maxThreadsPerGroup" to maxVertexAttribs,
            "maxThreadgroupMemoryLength" to maxTextureImageUnits
          ))
        } else {
          promise.resolve(mapOf(
            "name" to "Unknown",
            "maxThreadsPerGroup" to 0,
            "maxThreadgroupMemoryLength" to 0
          ))
        }
      } catch (e: Exception) {
        promise.reject("DEVICE_INFO_ERROR", "Failed to get device info", e)
      }
    }

    // Texture Management
    AsyncFunction("createTexture") { descriptor: Map<String, Any>, promise: Promise ->
      try {
        val width = descriptor["width"] as? Int ?: 0
        val height = descriptor["height"] as? Int ?: 0
        val pixelFormat = descriptor["pixelFormat"] as? String ?: "RGBA8Unorm"

        val textureIds = IntArray(1)
        GLES20.glGenTextures(1, textureIds, 0)
        
        if (textureIds[0] == 0) {
          promise.reject("TEXTURE_CREATION_FAILED", "Failed to create texture")
          return@AsyncFunction
        }

        val textureId = textureIds[0].toString()
        textures[textureId] = textureIds[0]

        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureIds[0])
        GLES20.glTexImage2D(
          GLES20.GL_TEXTURE_2D, 0, parsePixelFormat(pixelFormat),
          width, height, 0, parsePixelFormat(pixelFormat), GLES20.GL_UNSIGNED_BYTE, null
        )

        promise.resolve(mapOf(
          "id" to textureId,
          "width" to width,
          "height" to height,
          "pixelFormat" to pixelFormat,
          "mipmapLevelCount" to 1,
          "sampleCount" to 1,
          "arrayLength" to 1,
          "depth" to 1
        ))
      } catch (e: Exception) {
        promise.reject("TEXTURE_CREATION_ERROR", "Failed to create texture", e)
      }
    }

    // Initialize OpenGL
    OnCreate {
      try {
        val context = appContext.currentActivity?.applicationContext
        if (context != null) {
          val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
          val deviceInfo = activityManager.deviceConfigurationInfo
          isOpenGLAvailable = deviceInfo.reqGlEsVersion >= 0x20000
          
          if (isOpenGLAvailable) {
            val intArray = IntArray(1)
            GLES20.glGetIntegerv(GLES20.GL_MAX_TEXTURE_SIZE, intArray, 0)
            maxTextureSize = intArray[0]
            
            GLES20.glGetIntegerv(GLES20.GL_MAX_VERTEX_ATTRIBS, intArray, 0)
            maxVertexAttribs = intArray[0]
            
            GLES20.glGetIntegerv(GLES20.GL_MAX_TEXTURE_IMAGE_UNITS, intArray, 0)
            maxTextureImageUnits = intArray[0]
          }
        }
      } catch (e: Exception) {
        isOpenGLAvailable = false
      }
    }
  }

  private fun parsePixelFormat(format: String): Int {
    return when (format) {
      "RGBA8Unorm", "RGBA8Unorm_sRGB" -> GLES20.GL_RGBA
      "BGRA8Unorm", "BGRA8Unorm_sRGB" -> GLES20.GL_RGBA
      "RGB10A2Unorm" -> GLES20.GL_RGBA
      "RG11B10Float" -> GLES20.GL_RGB
      "RGB9E5Float" -> GLES20.GL_RGB
      "RGBA16Float" -> GLES30.GL_RGBA16F
      "RGBA32Float" -> GLES30.GL_RGBA32F
      "Depth32Float" -> GLES20.GL_DEPTH_COMPONENT
      "Depth24Unorm_Stencil8" -> GLES20.GL_DEPTH_STENCIL
      "Depth32Float_Stencil8" -> GLES20.GL_DEPTH_STENCIL
      else -> GLES20.GL_RGBA
    }
  }
}

data class MeshData(
  val vertexCount: Int,
  val primitiveType: String
)

data class AnimationData(
  val duration: Double,
  val repeatCount: Float,
  val autoreverses: Boolean,
  val timingFunction: String,
  var isRunning: Boolean = false,
  var currentTime: Double = 0.0
)
