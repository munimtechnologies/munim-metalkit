import { NativeModule, requireNativeModule } from 'expo';

import { MunimMetalkitModuleEvents } from './MunimMetalkit.types';

declare class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MunimMetalkitModule>('MunimMetalkit');
