import { registerWebModule, NativeModule } from 'expo';

import { MunimMetalkitModuleEvents } from './MunimMetalkit.types';

class MunimMetalkitModule extends NativeModule<MunimMetalkitModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(MunimMetalkitModule, 'MunimMetalkitModule');
