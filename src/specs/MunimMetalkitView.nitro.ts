import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from "react-native-nitro-modules";

import type {
  NativeFrameStats,
  NativeScreenshot,
  NativeScreenshotOptions,
} from "./MunimMetalkit.nitro";

/*
 * Native (Nitro) spec of `MunimMetalkitView`, an MTKView host. `MunimMetalkitView.tsx` wraps it
 * to keep the public props (`{ nativeEvent }` events, structured `drawableSize`/`clearColor`)
 * and the ref methods.
 */

export interface NativeLoadEvent {
  deviceName: string;
}

export interface NativeErrorEvent {
  error: string;
  code: string;
}

export interface MetalViewProps extends HybridViewProps {
  preferredFramesPerSecond?: number;
  enableSetNeedsDisplay?: boolean;
  paused?: boolean;
  autoResizeDrawable?: boolean;
  /** `[width, height]` in pixels; empty for automatic sizing. */
  drawableSize?: number[];
  colorPixelFormat?: string;
  depthStencilPixelFormat?: string;
  sampleCount?: number;
  /** `[red, green, blue, alpha]`; empty for the default (opaque black). */
  clearColor?: number[];
  /** Render pipeline id to draw with instead of the built-in shader. */
  renderPipelineId?: string;
  vertexCount?: number;
  instanceCount?: number;
  primitiveType?: string;
  /** Compute pipeline id dispatched every frame before the render pass. */
  computePipelineId?: string;
  /** `[width, height, depth]` threads; empty for one thread per render-target pixel. */
  computeThreads?: number[];
  /** Buffer ids bound at `[[buffer(i)]]` in every stage. */
  buffers?: string[];
  /** Texture ids bound at `[[texture(i)]]` in every stage. */
  textures?: string[];
  /** Shared buffer snapshotted every frame (triple-buffered) and bound at `[[buffer(29)]]`. */
  uniformBufferId?: string;
  /** Fraction of the drawable size to render at; upscaled with MetalFX. */
  renderScale?: number;
  onLoad?: (event: NativeLoadEvent) => void;
  onRender?: (event: NativeFrameStats) => void;
  onError?: (event: NativeErrorEvent) => void;
}

export interface MetalViewMethods extends HybridViewMethods {
  takeScreenshot(options?: NativeScreenshotOptions): Promise<NativeScreenshot>;
  renderFrame(): Promise<void>;
}

export type MunimMetalkitView = HybridView<
  MetalViewProps,
  MetalViewMethods,
  { ios: "swift"; android: "kotlin" }
>;
