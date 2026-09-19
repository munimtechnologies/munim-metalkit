package expo.modules.munimmetalkit

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Metal is Apple-only, so on Android the module is an honest stub: `isMetalAvailable()` returns
 * false and every async method rejects with ERR_METAL_UNAVAILABLE. (1.x shipped an unregistered
 * OpenGL ES renderer and a createTexture that never had a GL context; both were removed.)
 */
class MunimMetalkitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MunimMetalkit")

    Constant("PI") { Math.PI }

    Function("isMetalAvailable") { false }

    // Arity per method, so calls with the documented arguments reach the rejection below
    // instead of failing on an argument-count mismatch.
    for ((name, arity) in ASYNC_METHODS) {
      when (arity) {
        0 -> AsyncFunction(name) { -> throw MetalUnavailableException(name) }
        1 -> AsyncFunction(name) { _: Any? -> throw MetalUnavailableException(name) }
        2 -> AsyncFunction(name) { _: Any?, _: Any? -> throw MetalUnavailableException(name) }
        3 -> AsyncFunction(name) { _: Any?, _: Any?, _: Any? -> throw MetalUnavailableException(name) }
        else -> AsyncFunction(name) { _: Any?, _: Any?, _: Any?, _: Any? -> throw MetalUnavailableException(name) }
      }
    }

    View(MunimMetalkitView::class) {
      Events("onLoad", "onRender", "onError")
    }
  }

  companion object {
    /** Keep in sync with src/MunimMetalkitModule.ts. */
    private val ASYNC_METHODS = listOf(
      "getDeviceInfo" to 0,
      "createTexture" to 1,
      "loadTextureFromURL" to 2,
      "loadTextureFromData" to 2,
      "updateTexture" to 4,
      "readTexture" to 3,
      "generateMipmaps" to 1,
      "releaseTexture" to 1,
      "createBuffer" to 1,
      "createBufferWithData" to 2,
      "updateBuffer" to 3,
      "getBufferContents" to 1,
      "releaseBuffer" to 1,
      "createShaderLibrary" to 1,
      "getShaderLibraryFunctionNames" to 1,
      "releaseShaderLibrary" to 1,
      "createComputePipelineState" to 2,
      "releaseComputePipelineState" to 1,
      "dispatchCompute" to 4,
      "createRenderPipelineState" to 1,
      "releaseRenderPipelineState" to 1,
      "startRendering" to 0,
      "stopRendering" to 0,
      "pauseRendering" to 0,
      "resumeRendering" to 0,
      "setNeedsDisplay" to 0,
      "setPreferredFramesPerSecond" to 1,
      "setClearColor" to 4,
      "setDrawableSize" to 2,
      "takeScreenshot" to 1,
      "getPerformanceInfo" to 0,
      "createMesh" to 1,
      "loadMeshFromURL" to 1,
      "loadMeshFromData" to 2,
      "updateMesh" to 2,
      "releaseMesh" to 1,
      "createAnimation" to 1,
      "startAnimation" to 1,
      "pauseAnimation" to 1,
      "stopAnimation" to 1,
      "setAnimationTime" to 2,
      "releaseAnimation" to 1,
      "setScene" to 1,
      "updateCamera" to 1,
      "updateLighting" to 1,
      "createCanvas2D" to 3,
      "clearCanvas2D" to 2,
      "drawLine2D" to 4,
      "drawRectangle2D" to 3,
      "drawCircle2D" to 3,
      "drawEllipse2D" to 3,
      "drawPath2D" to 3,
      "drawText2D" to 4,
      "measureText2D" to 2,
      "drawImage2D" to 4,
      "compositeCanvas2D" to 3,
      "saveCanvas2D" to 1,
      "restoreCanvas2D" to 1,
      "translateCanvas2D" to 3,
      "rotateCanvas2D" to 2,
      "scaleCanvas2D" to 3,
      "setTransformCanvas2D" to 2,
      "createDrawingLayer" to 2,
      "deleteDrawingLayer" to 2,
      "setActiveLayer" to 2,
      "setLayerOpacity" to 3,
      "setLayerBlendMode" to 3,
      "toggleLayerVisibility" to 2,
      "setBrushStyle" to 2,
      "setLineStyle" to 2,
      "setFillStyle" to 2,
      "setTextStyle" to 2,
      "resizeCanvas2D" to 3,
      "cropCanvas2D" to 2,
      "flipCanvas2D" to 3,
      "exportCanvas2D" to 2,
      "importImageToCanvas2D" to 3,
      "getCanvas2DPixel" to 3,
      "setCanvas2DPixel" to 4,
      "getCanvas2DData" to 1,
      "setCanvas2DData" to 2,
    )
  }
}

class MetalUnavailableException(method: String) :
  CodedException(
    "ERR_METAL_UNAVAILABLE",
    "munim-metalkit: $method() is unavailable on Android. Metal is only available on iOS.",
    null
  )
