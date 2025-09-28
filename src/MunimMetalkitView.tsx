import { requireNativeView } from 'expo';
import * as React from 'react';

import { MunimMetalkitViewProps } from './MunimMetalkit.types';

const NativeView: React.ComponentType<MunimMetalkitViewProps> =
  requireNativeView('MunimMetalkit');

export default function MunimMetalkitView(props: MunimMetalkitViewProps) {
  return <NativeView {...props} />;
}
