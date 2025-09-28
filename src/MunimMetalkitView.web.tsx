import * as React from 'react';

import { MunimMetalkitViewProps } from './MunimMetalkit.types';

export default function MunimMetalkitView(props: MunimMetalkitViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
