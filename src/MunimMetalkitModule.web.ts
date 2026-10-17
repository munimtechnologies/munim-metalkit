import { makeError } from "./internal";
import type { MunimMetalkitModule } from "./MunimMetalkitModule";
import { ASYNC_METHOD_NAMES } from "./methodNames";

// Metal does not exist on the web. Rather than emulating parts of the API with WebGL (which the
// 1.x releases did inconsistently), every async method rejects with ERR_METAL_UNAVAILABLE.
const asyncMethods = Object.fromEntries(
  ASYNC_METHOD_NAMES.map((name) => [
    name,
    () =>
      Promise.reject(
        makeError(
          "ERR_METAL_UNAVAILABLE",
          `munim-metalkit: ${name}() is unavailable on web. Metal is only available on iOS.`,
        ),
      ),
  ]),
);

const MunimMetalkit = {
  ...asyncMethods,

  PI: Math.PI,

  addListener: () => ({ remove() {} }),
  removeListener() {},
  removeAllListeners() {},
  emit() {},
  listenerCount: () => 0,

  isMetalAvailable: () => false,
} as unknown as MunimMetalkitModule;

export default MunimMetalkit;
