import { NativeModule, registerWebModule } from "expo";

import type { MunimMetalkitModuleEvents } from "./MunimMetalkit.types";
import { ASYNC_METHOD_NAMES } from "./methodNames";

class MetalUnavailableError extends Error {
  code = "ERR_METAL_UNAVAILABLE";

  constructor(method: string) {
    super(
      `munim-metalkit: ${method}() is unavailable on web. Metal is only available on iOS.`,
    );
    this.name = "MunimMetalkitError";
  }
}

// Metal does not exist on the web. Rather than emulating parts of the API with WebGL (which the
// 1.x releases did inconsistently), every async method rejects with ERR_METAL_UNAVAILABLE.
class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  PI = Math.PI;

  constructor() {
    super();
    for (const name of ASYNC_METHOD_NAMES) {
      Object.defineProperty(this, name, {
        value: () => Promise.reject(new MetalUnavailableError(name)),
        enumerable: true,
      });
    }
  }

  isMetalAvailable(): boolean {
    return false;
  }
}

export default registerWebModule(MunimMetalkitModule, "MunimMetalkit");
