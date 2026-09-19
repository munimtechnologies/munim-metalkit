package expo.modules.munimmetalkit

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** Placeholder view: Metal does not exist on Android. Reports an onError event once attached. */
class MunimMetalkitView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onError by EventDispatcher()
  private var reported = false

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (!reported) {
      reported = true
      onError(
        mapOf(
          "error" to "MunimMetalkitView is unavailable on Android. Metal is only available on iOS.",
          "code" to "ERR_METAL_UNAVAILABLE"
        )
      )
    }
  }
}
