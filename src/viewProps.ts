import type { MunimMetalkitViewProps } from "./MunimMetalkit.types";
import type { MetalViewProps } from "./specs/MunimMetalkitView.nitro";

/** View props that are forwarded to the native view (everything except events, refs and style). */
export type ForwardedViewProps = Omit<
  MetalViewProps,
  "onLoad" | "onRender" | "onError" | "hybridRef" | "style"
>;

/** Public prop names handled by `toNativeViewProps`. */
export const VIEW_PROP_NAMES: ReadonlySet<string> = new Set([
  "drawableSize",
  "clearColor",
  "computeThreads",
  "preferredFramesPerSecond",
  "enableSetNeedsDisplay",
  "paused",
  "autoResizeDrawable",
  "colorPixelFormat",
  "depthStencilPixelFormat",
  "sampleCount",
  "renderPipelineId",
  "vertexCount",
  "instanceCount",
  "primitiveType",
  "computePipelineId",
  "buffers",
  "textures",
  "uniformBufferId",
  "renderScale",
]);

/**
 * Converts the public props to the native (Nitro) props: structured sizes and colors become
 * arrays, and the unimplemented 1.x props (`scene`, `camera`, `lighting`, `onAnimationComplete`)
 * are dropped. Only props that are set are included, so a removed prop reaches native code as
 * "unset" and restores its default.
 */
export function toNativeViewProps(
  props: MunimMetalkitViewProps,
): ForwardedViewProps {
  const {
    drawableSize,
    clearColor,
    computeThreads,
    preferredFramesPerSecond,
    enableSetNeedsDisplay,
    paused,
    autoResizeDrawable,
    colorPixelFormat,
    depthStencilPixelFormat,
    sampleCount,
    renderPipelineId,
    vertexCount,
    instanceCount,
    primitiveType,
    computePipelineId,
    buffers,
    textures,
    uniformBufferId,
    renderScale,
  } = props;
  return {
    preferredFramesPerSecond,
    enableSetNeedsDisplay,
    paused,
    autoResizeDrawable,
    colorPixelFormat,
    depthStencilPixelFormat,
    sampleCount,
    renderPipelineId,
    vertexCount,
    instanceCount,
    primitiveType,
    computePipelineId,
    buffers,
    textures,
    uniformBufferId,
    renderScale,
    drawableSize: drawableSize
      ? [drawableSize.width, drawableSize.height]
      : undefined,
    clearColor: clearColor
      ? [
          clearColor.red ?? 0,
          clearColor.green ?? 0,
          clearColor.blue ?? 0,
          clearColor.alpha ?? 1,
        ]
      : undefined,
    computeThreads: computeThreads
      ? [
          computeThreads.width,
          computeThreads.height ?? 1,
          computeThreads.depth ?? 1,
        ]
      : undefined,
  };
}
