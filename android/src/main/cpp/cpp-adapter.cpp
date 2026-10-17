#include <jni.h>
#include <fbjni/fbjni.h>
#include "MunimMetalkitOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    // Registers every MunimMetalkit HybridObject and its JNI natives.
    margelo::nitro::munimmetalkit::registerAllNatives();
  });
}
