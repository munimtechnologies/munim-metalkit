package com.margelo.nitro.munimmetalkit

import android.view.View
import android.widget.FrameLayout
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.Promise

/**
 * Placeholder view: Metal does not exist on Android. Reports one `onError` event
 * (ERR_METAL_UNAVAILABLE) once it is attached, and its ref methods reject.
 */
@DoNotStrip
@Keep
class HybridMunimMetalkitView(context: ThemedReactContext) : HybridMunimMetalkitViewSpec() {
  override val view: View = FrameLayout(context)

  private var reported = false

  init {
    view.addOnAttachStateChangeListener(
      object : View.OnAttachStateChangeListener {
        override fun onViewAttachedToWindow(v: View) = reportUnavailable()

        override fun onViewDetachedFromWindow(v: View) = Unit
      }
    )
  }

  override var preferredFramesPerSecond: Double? = null
  override var enableSetNeedsDisplay: Boolean? = null
  override var paused: Boolean? = null
  override var autoResizeDrawable: Boolean? = null
  override var drawableSize: DoubleArray? = null
  override var colorPixelFormat: String? = null
  override var depthStencilPixelFormat: String? = null
  override var sampleCount: Double? = null
  override var clearColor: DoubleArray? = null
  override var onLoad: ((event: NativeLoadEvent) -> Unit)? = null
  override var onRender: ((event: NativeFrameStats) -> Unit)? = null
  override var onError: ((event: NativeErrorEvent) -> Unit)? = null

  override fun afterUpdate() {
    super.afterUpdate()
    // onError may be set after the view was attached.
    if (view.isAttachedToWindow) reportUnavailable()
  }

  private fun reportUnavailable() {
    val callback = onError ?: return
    if (reported) return
    reported = true
    callback(NativeErrorEvent(VIEW_UNAVAILABLE_MESSAGE, "ERR_METAL_UNAVAILABLE"))
  }

  override fun takeScreenshot(options: NativeScreenshotOptions?): Promise<NativeScreenshot> =
    Promise.rejected(MetalUnavailableException("takeScreenshot"))

  override fun renderFrame(): Promise<Unit> = Promise.rejected(MetalUnavailableException("renderFrame"))
}
