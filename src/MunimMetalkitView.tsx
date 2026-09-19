import { requireNativeView } from "expo";
import * as React from "react";

import type {
  MunimMetalkitViewProps,
  MunimMetalkitViewRef,
} from "./MunimMetalkit.types";

type NativeProps = Omit<
  MunimMetalkitViewProps,
  "scene" | "camera" | "lighting" | "onAnimationComplete"
>;

const NativeView: React.ComponentType<
  NativeProps & React.RefAttributes<MunimMetalkitViewRef>
> = requireNativeView("MunimMetalkit");

const warned = new Set<string>();

/**
 * An MTKView that renders the package's built-in shader (a rotating RGB triangle).
 * Use a ref to call `takeScreenshot()` / `renderFrame()`.
 */
const MunimMetalkitView = React.forwardRef<
  MunimMetalkitViewRef,
  MunimMetalkitViewProps
>(function MunimMetalkitView(props, ref) {
  const {
    style,
    scene,
    camera,
    lighting,
    onAnimationComplete: _unused,
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

  return <NativeView ref={ref} style={[{ flex: 1 }, style]} {...rest} />;
});

export default MunimMetalkitView;
