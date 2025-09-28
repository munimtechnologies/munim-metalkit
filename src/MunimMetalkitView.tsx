import { requireNativeView } from "expo";
import * as React from "react";
import { ViewStyle } from "react-native";

import { MunimMetalkitViewProps } from "./MunimMetalkit.types";

const NativeView: React.ComponentType<MunimMetalkitViewProps> =
  requireNativeView("MunimMetalkit");

export default function MunimMetalkitView(props: MunimMetalkitViewProps) {
  const {
    style,
    preferredFramesPerSecond = 60,
    enableSetNeedsDisplay = true,
    autoResizeDrawable = true,
    drawableSize,
    colorPixelFormat = "BGRA8Unorm",
    depthStencilPixelFormat = "Depth32Float",
    sampleCount = 1,
    clearColor = { red: 0, green: 0, blue: 0, alpha: 1 },
    onLoad,
    onRender,
    onError,
    onAnimationComplete,
    scene,
    camera,
    lighting,
    ...restProps
  } = props;

  const defaultStyle: ViewStyle = {
    flex: 1,
    backgroundColor: "transparent",
  };

  return (
    <NativeView
      style={[defaultStyle, style]}
      preferredFramesPerSecond={preferredFramesPerSecond}
      enableSetNeedsDisplay={enableSetNeedsDisplay}
      autoResizeDrawable={autoResizeDrawable}
      drawableSize={drawableSize}
      colorPixelFormat={colorPixelFormat}
      depthStencilPixelFormat={depthStencilPixelFormat}
      sampleCount={sampleCount}
      clearColor={clearColor}
      onLoad={onLoad}
      onRender={onRender}
      onError={onError}
      onAnimationComplete={onAnimationComplete}
      scene={scene}
      camera={camera}
      lighting={lighting}
      {...restProps}
    />
  );
}
