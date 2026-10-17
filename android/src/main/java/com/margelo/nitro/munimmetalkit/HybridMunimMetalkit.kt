package com.margelo.nitro.munimmetalkit

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise

/**
 * Metal is Apple-only, so on Android the module is an honest stub: `isMetalAvailable()` returns
 * false and every async method rejects with ERR_METAL_UNAVAILABLE.
 */
@DoNotStrip
@Keep
class HybridMunimMetalkit : HybridMunimMetalkitSpec() {
  private fun <T> unavailable(method: String): Promise<T> =
    Promise.rejected(MetalUnavailableException(method))

  override fun isMetalAvailable(): Boolean = false

  override fun getDeviceInfo(): Promise<NativeDeviceInfo> = unavailable("getDeviceInfo")

  override fun getMetalCapabilities(): Promise<NativeMetalCapabilities> = unavailable("getMetalCapabilities")

  override fun createTexture(descriptor: NativeTextureDescriptor): Promise<NativeTexture> =
    unavailable("createTexture")

  override fun loadTextureFromURL(url: String, options: NativeTextureLoadOptions?): Promise<NativeTexture> =
    unavailable("loadTextureFromURL")

  override fun loadTextureFromData(data: ArrayBuffer, options: NativeTextureLoadOptions?): Promise<NativeTexture> =
    unavailable("loadTextureFromData")

  override fun updateTexture(
    textureId: String,
    data: ArrayBuffer,
    region: NativeTextureRegion?,
    options: NativeTextureTransferOptions?
  ): Promise<Unit> = unavailable("updateTexture")

  override fun readTexture(
    textureId: String,
    region: NativeTextureRegion?,
    options: NativeTextureTransferOptions?
  ): Promise<ArrayBuffer> = unavailable("readTexture")

  override fun generateMipmaps(textureId: String): Promise<Unit> = unavailable("generateMipmaps")

  override fun releaseTexture(textureId: String): Promise<Unit> = unavailable("releaseTexture")

  override fun createBuffer(descriptor: NativeBufferDescriptor): Promise<NativeBuffer> = unavailable("createBuffer")

  override fun createBufferWithData(data: ArrayBuffer, options: String?): Promise<NativeBuffer> =
    unavailable("createBufferWithData")

  override fun updateBuffer(bufferId: String, data: ArrayBuffer, offset: Double?): Promise<Unit> =
    unavailable("updateBuffer")

  override fun getBufferContents(bufferId: String): Promise<ArrayBuffer> = unavailable("getBufferContents")

  override fun releaseBuffer(bufferId: String): Promise<Unit> = unavailable("releaseBuffer")

  override fun createShaderLibrary(source: String): Promise<String> = unavailable("createShaderLibrary")

  override fun getShaderLibraryFunctionNames(libraryId: String): Promise<Array<String>> =
    unavailable("getShaderLibraryFunctionNames")

  override fun releaseShaderLibrary(libraryId: String): Promise<Unit> = unavailable("releaseShaderLibrary")

  override fun createComputePipelineState(
    libraryId: String,
    functionName: String
  ): Promise<NativeComputePipelineState> = unavailable("createComputePipelineState")

  override fun releaseComputePipelineState(pipelineId: String): Promise<Unit> =
    unavailable("releaseComputePipelineState")

  override fun dispatchCompute(
    pipelineId: String,
    buffers: Array<String>,
    threadgroups: NativeThreadSize,
    options: NativeDispatchOptions?
  ): Promise<NativeComputeDispatchResult> = unavailable("dispatchCompute")

  override fun createRenderPipelineState(
    descriptor: NativeRenderPipelineDescriptor
  ): Promise<NativeRenderPipelineState> = unavailable("createRenderPipelineState")

  override fun releaseRenderPipelineState(pipelineId: String): Promise<Unit> =
    unavailable("releaseRenderPipelineState")

  override fun startRendering(): Promise<Unit> = unavailable("startRendering")

  override fun stopRendering(): Promise<Unit> = unavailable("stopRendering")

  override fun pauseRendering(): Promise<Unit> = unavailable("pauseRendering")

  override fun resumeRendering(): Promise<Unit> = unavailable("resumeRendering")

  override fun setNeedsDisplay(): Promise<Unit> = unavailable("setNeedsDisplay")

  override fun setPreferredFramesPerSecond(fps: Double): Promise<Unit> = unavailable("setPreferredFramesPerSecond")

  override fun setClearColor(red: Double, green: Double, blue: Double, alpha: Double): Promise<Unit> =
    unavailable("setClearColor")

  override fun setDrawableSize(width: Double, height: Double): Promise<Unit> = unavailable("setDrawableSize")

  override fun takeScreenshot(options: NativeScreenshotOptions?): Promise<NativeScreenshot> =
    unavailable("takeScreenshot")

  override fun getPerformanceInfo(): Promise<NativePerformanceInfo> = unavailable("getPerformanceInfo")
}
