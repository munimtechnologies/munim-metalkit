import * as React from "react";
import { View } from "react-native";

import type { MunimMetalkitViewProps } from "./MunimMetalkit.types";

/** Metal is not available on the web; the view renders an empty placeholder and reports an error. */
export default function MunimMetalkitView(props: MunimMetalkitViewProps) {
  const { style, onError } = props;

  React.useEffect(() => {
    onError?.({
      nativeEvent: {
        error:
          "MunimMetalkitView is unavailable on web. Metal is only available on iOS.",
        code: "ERR_METAL_UNAVAILABLE",
      },
    });
    // Report once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={style} />;
}
