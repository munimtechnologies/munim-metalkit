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
