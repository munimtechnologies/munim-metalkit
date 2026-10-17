import type {
  BinaryData,
  MunimMetalkitErrorCode,
  Screenshot,
} from "./MunimMetalkit.types";
import type { NativeScreenshot } from "./specs/MunimMetalkit.nitro";

/** An `Error` with the `code` property callers rely on (`error.code === "ERR_..."`). */
export type MunimMetalkitError = Error & {
  code: MunimMetalkitErrorCode | string;
};

export function makeError(code: string, message: string): MunimMetalkitError {
  const error = new Error(message) as MunimMetalkitError;
  error.name = "MunimMetalkitError";
  error.code = code;
  return error;
}

const CODED_MESSAGE = /\[(ERR_[A-Z0-9_]+)\] ?([\s\S]*)$/;

/**
 * Native code reports errors as `[ERR_CODE] message`. Turns that back into an error whose
 * `message` is the plain message and whose `code` is the code. Other errors (for example a JSI
 * argument conversion error) pass through unchanged.
 */
export function toMunimMetalkitError(error: unknown): unknown {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : undefined;
  const match = message === undefined ? null : CODED_MESSAGE.exec(message);
  if (!match) {
    return error;
  }
  return makeError(match[1]!, match[2]!);
}

/**
 * Runs a native async call so that it always returns a promise: synchronous native throws (for
 * example invalid arguments) become rejections, and every rejection carries `error.code`.
 */
export async function call<T>(body: () => Promise<T> | T): Promise<T> {
  try {
    return await body();
  } catch (error) {
    throw toMunimMetalkitError(error);
  }
}

/** Typed arrays are sent as their viewed bytes; a whole-buffer view is passed without copying. */
export function toArrayBuffer(data: BinaryData): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    const { buffer, byteOffset, byteLength } = data;
    if (
      buffer instanceof ArrayBuffer &&
      byteOffset === 0 &&
      byteLength === buffer.byteLength
    ) {
      return buffer;
    }
    return new Uint8Array(buffer, byteOffset, byteLength).slice().buffer;
  }
  throw makeError(
    "ERR_INVALID_ARGUMENT",
    "Binary data must be an ArrayBuffer or an ArrayBufferView (e.g. a Uint8Array).",
  );
}

/** Only the key that applies (`base64` or `uri`) is present, as before. */
export function toScreenshot(native: NativeScreenshot): Screenshot {
  const shot: Screenshot = { width: native.width, height: native.height };
  if (native.base64 !== undefined) shot.base64 = native.base64;
  if (native.uri !== undefined) shot.uri = native.uri;
  return shot;
}
