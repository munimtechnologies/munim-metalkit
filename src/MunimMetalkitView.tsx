import * as React from "react";
import { StyleSheet } from "react-native";
import {
  callback,
  getHostComponent,
  type HybridRef,
} from "react-native-nitro-modules";

import MunimMetalkitViewConfig from "./specs/MunimMetalkitViewConfig.json";
import type {
  MunimMetalkitViewProps,
  MunimMetalkitViewRef,
  ScreenshotOptions,
} from "./MunimMetalkit.types";
import { call, makeError, toScreenshot } from "./internal";
import type { NativeFrameStats } from "./specs/MunimMetalkit.nitro";
import type {
  MetalViewMethods,
  MetalViewProps,
  NativeErrorEvent,
  NativeLoadEvent,
} from "./specs/MunimMetalkitView.nitro";

const NativeView = getHostComponent<MetalViewProps, MetalViewMethods>(
  "MunimMetalkitView",
  () => MunimMetalkitViewConfig,
);

type NativeViewRef = HybridRef<MetalViewProps, MetalViewMethods>;

const warned = new Set<string>();

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * An MTKView that renders the package's built-in shader (a rotating RGB triangle).
 * Use a ref to call `takeScreenshot()` / `renderFrame()`.
 */
const MunimMetalkitView = React.forwardRef<
  MunimMetalkitViewRef,
  MunimMetalkitViewProps
>(function MunimMetalkitViewImpl(props, ref) {
  const {
    style,
    scene,
    camera,
    lighting,
    // Never called (animations are not implemented); kept out of the native props.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onAnimationComplete,
    onLoad,
    onRender,
    onError,
    drawableSize,
    clearColor,
    ...rest
  } = props;

  if (__DEV__) {
    for (const [name, value] of [
      ["scene", scene],
      ["camera", camera],
      ["lighting", lighting],
    ] as const) {
      if (value !== undefined && !warned.has(name)) {
        warned.add(name);
        console.warn(
          `MunimMetalkitView: the "${name}" prop is not implemented and is ignored. See the README "What works" table.`,
        );
      }
    }
  }

  // Event handlers are read through a ref so the native callbacks stay stable across renders.
  const handlers = React.useRef({ onLoad, onRender, onError });
  handlers.current = { onLoad, onRender, onError };

  const nativeRef = React.useRef<NativeViewRef | null>(null);
  const native = React.useMemo(
    () => ({
      hybridRef: callback((view: NativeViewRef) => {
        nativeRef.current = view;
      }),
      onLoad: callback((event: NativeLoadEvent) => {
        handlers.current.onLoad?.({
          nativeEvent: { deviceName: event.deviceName },
        });
      }),
      onRender: callback((event: NativeFrameStats) => {
        handlers.current.onRender?.({
          nativeEvent: {
            frameTime: event.frameTime,
            fps: event.fps,
            gpuFrameTime: nullable(event.gpuFrameTime),
            lastComputeGpuTime: nullable(event.lastComputeGpuTime),
            framesRendered: event.framesRendered,
            drawCallCount: event.drawCallCount,
            triangleCount: event.triangleCount,
          },
        });
      }),
      onError: callback((event: NativeErrorEvent) => {
        handlers.current.onError?.({
          nativeEvent: { error: event.error, code: event.code },
        });
      }),
    }),
    [],
  );

  React.useImperativeHandle(ref, () => {
    const view = () => {
      const current = nativeRef.current;
      if (!current) {
        throw makeError(
          "ERR_INVALID_ARGUMENT",
          "MunimMetalkitView is not mounted.",
        );
      }
      return current;
    };
    return {
      takeScreenshot: (options?: ScreenshotOptions) =>
        call(async () => toScreenshot(await view().takeScreenshot(options))),
      renderFrame: () => call(() => view().renderFrame()),
    };
  }, []);

  return (
    <NativeView
      {...rest}
      style={[styles.fill, style]}
      drawableSize={
        drawableSize ? [drawableSize.width, drawableSize.height] : undefined
      }
      clearColor={
        clearColor
          ? [
              clearColor.red ?? 0,
              clearColor.green ?? 0,
              clearColor.blue ?? 0,
              clearColor.alpha ?? 1,
            ]
          : undefined
      }
      hybridRef={native.hybridRef}
      onLoad={native.onLoad}
      onRender={native.onRender}
      onError={native.onError}
    />
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });

export default MunimMetalkitView;
