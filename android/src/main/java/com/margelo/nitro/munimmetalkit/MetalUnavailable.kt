package com.margelo.nitro.munimmetalkit

/**
 * Metal is Apple-only. Every Android call fails with this error; the TypeScript wrapper turns the
 * `[ERR_METAL_UNAVAILABLE]` prefix into `error.code`.
 */
class MetalUnavailableException(method: String) :
  Exception("[ERR_METAL_UNAVAILABLE] munim-metalkit: $method() is unavailable on Android. Metal is only available on iOS.")

internal const val VIEW_UNAVAILABLE_MESSAGE =
  "MunimMetalkitView is unavailable on Android. Metal is only available on iOS."
