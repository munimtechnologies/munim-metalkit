<!-- Banner Image -->

<p align="center">
  <a href="https://github.com/munimtechnologies/munim-metalkit">
    <img alt="Munim Technologies MetalKit" height="128" src="./.github/resources/banner.png?v=3">
    <h1 align="center">munim-metalkit</h1>
  </a>
</p>

<p align="center">
   <a aria-label="Package version" href="https://www.npmjs.com/package/munim-metalkit" target="_blank">
    <img alt="Package version" src="https://img.shields.io/npm/v/munim-metalkit.svg?style=flat-square&label=Version&labelColor=000000&color=0066CC" />
  </a>
  <a aria-label="Package is free to use" href="https://github.com/munimtechnologies/munim-metalkit/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=flat-square&color=33CC12" target="_blank" />
  </a>
  <a aria-label="package downloads" href="https://www.npmtrends.com/munim-metalkit" target="_blank">
    <img alt="Downloads" src="https://img.shields.io/npm/dm/munim-metalkit.svg?style=flat-square&labelColor=gray&color=33CC12&label=Downloads" />
  </a>
  <a aria-label="total package downloads" href="https://www.npmjs.com/package/munim-metalkit" target="_blank">
    <img alt="Total Downloads" src="https://img.shields.io/npm/dt/munim-metalkit.svg?style=flat-square&labelColor=gray&color=0066CC&label=Total%20Downloads" />
  </a>
</p>

<p align="center">
  <a aria-label="try with expo" href="https://docs.expo.dev/"><b>Works with Expo</b></a>
&ensp;•&ensp;
  <a aria-label="documentation" href="https://github.com/munimtechnologies/munim-metalkit#readme">Read the Documentation</a>
&ensp;•&ensp;
  <a aria-label="report issues" href="https://github.com/munimtechnologies/munim-metalkit/issues">Report Issues</a>
</p>

<h6 align="center">Follow Munim Technologies</h6>
<p align="center">
  <a aria-label="Follow Munim Technologies on GitHub" href="https://github.com/munimtechnologies" target="_blank">
    <img alt="Munim Technologies on GitHub" src="https://img.shields.io/badge/GitHub-222222?style=for-the-badge&logo=github&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Follow Munim Technologies on LinkedIn" href="https://linkedin.com/in/sheehanmunim" target="_blank">
    <img alt="Munim Technologies on LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Visit Munim Technologies Website" href="https://munimtech.com" target="_blank">
    <img alt="Munim Technologies Website" src="https://img.shields.io/badge/Website-0066CC?style=for-the-badge&logo=globe&logoColor=white" target="_blank" />
  </a>
</p>

## Introduction

**munim-metalkit** is a React Native library that brings the full power of Apple's MetalKit to React Native applications. This library provides comprehensive 3D graphics capabilities, GPU-accelerated rendering, and advanced graphics features across iOS, Android, and Web platforms.

**Fully compatible with Expo!** Works seamlessly with both Expo managed and bare workflows.

**Note**: This library focuses on providing a complete MetalKit API surface with cross-platform compatibility. It uses native MetalKit on iOS, OpenGL ES/Vulkan on Android, and WebGL on web platforms to ensure maximum performance and feature parity.

## Table of contents

- [📚 Documentation](#-documentation)
- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [🔧 API Reference](#-api-reference)
- [📖 Usage Examples](#-usage-examples)
- [🔍 Troubleshooting](#-troubleshooting)
- [👏 Contributing](#-contributing)
- [📄 License](#-license)

## 📚 Documentation

<p>Learn about building 3D graphics apps <a aria-label="documentation" href="https://github.com/munimtechnologies/munim-metalkit#readme">in our documentation!</a></p>

- [Getting Started](#-installation)
- [API Reference](#-api-reference)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)

## 🚀 Features

- 🎨 **Complete MetalKit API**: Full access to MetalKit's 3D graphics capabilities
- 🖌️ **2D Drawing Support**: Comprehensive 2D drawing tools and canvas API
- 📱 **Cross-Platform**: Native MetalKit on iOS, OpenGL ES on Android, WebGL on web
- ⚡ **High Performance**: Direct GPU access for maximum rendering performance
- 🎯 **TypeScript Support**: Full TypeScript definitions included
- 🚀 **Expo Compatible**: Works seamlessly with Expo managed and bare workflows
- 🔧 **Texture Management**: Create, load, update, and manage textures with full pixel format support
- 🎭 **Shader Support**: Compile and manage vertex, fragment, and compute shaders
- 🎪 **Mesh Rendering**: Load and render 3D meshes in multiple formats
- 🎬 **Animation System**: Create and control complex 3D animations
- 🌍 **Scene Management**: Full 3D scene support with cameras and lighting
- 🖼️ **2D Canvas API**: Canvas-like drawing interface with layers, brushes, and tools
- ✏️ **Drawing Tools**: Lines, rectangles, circles, ellipses, paths, and text rendering
- 🎨 **Layer Management**: Multi-layer support with blend modes and opacity control
- 📊 **Performance Monitoring**: Real-time performance metrics and optimization tools
- 📸 **Screenshot Capture**: Take high-quality screenshots of rendered content

## 📦 Installation

### React Native CLI

```bash
npm install munim-metalkit
# or
yarn add munim-metalkit
```

### Expo

```bash
npx expo install munim-metalkit
```

> **Note**: This library requires Expo SDK 50+ and works with both managed and bare workflows.

### iOS Setup

For iOS, the library is automatically linked. However, you need to add the following to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera for 3D graphics rendering</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app accesses the photo library for texture loading</string>
```

**For Expo projects**, add these permissions to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera for 3D graphics rendering",
        "NSPhotoLibraryUsageDescription": "This app accesses the photo library for texture loading"
      }
    }
  }
}
```

### Android Setup

For Android, add the following permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-feature android:name="android.hardware.opengles.aep" android:required="true" />
```

**For Expo projects**, add these permissions to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## ⚡ Quick Start

### Basic Usage

```typescript
import React from "react";
import { View } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <MunimMetalkitView
        style={{ flex: 1 }}
        preferredFramesPerSecond={60}
        clearColor={{ red: 0.2, green: 0.3, blue: 0.8, alpha: 1.0 }}
        onLoad={() => console.log("MetalKit View Loaded")}
        onRender={({ nativeEvent }) => {
          console.log(`Frame time: ${nativeEvent.frameTime}ms`);
        }}
        onError={({ nativeEvent }) => {
          console.error(`MetalKit Error: ${nativeEvent.error}`);
        }}
      />
    </View>
  );
}
```

### Advanced Usage with Textures and Meshes

```typescript
import React, { useEffect, useState } from "react";
import { View, Button, Alert } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

export default function AdvancedApp() {
  const [textures, setTextures] = useState([]);
  const [meshes, setMeshes] = useState([]);

  useEffect(() => {
    initializeGraphics();
  }, []);

  const initializeGraphics = async () => {
    try {
      // Check if Metal is available
      const isMetalAvailable = MunimMetalkit.isMetalAvailable();
      console.log("Metal available:", isMetalAvailable);

      // Get device information
      const deviceInfo = await MunimMetalkit.getDeviceInfo();
      console.log("Device info:", deviceInfo);

      // Create a texture
      const texture = await MunimMetalkit.createTexture({
        width: 512,
        height: 512,
        pixelFormat: "RGBA8Unorm",
        usage: "ShaderRead",
        mipmapLevelCount: 1,
        sampleCount: 1,
        arrayLength: 1,
        depth: 1,
        storageMode: "Private",
      });
      setTextures([texture]);

      // Create a mesh
      const buffer = await MunimMetalkit.createBuffer({
        length: 1024,
        options: "StorageModePrivate",
      });

      const mesh = await MunimMetalkit.createMesh({
        vertexBuffers: [buffer],
        vertexCount: 3,
        primitiveType: "Triangle",
      });
      setMeshes([mesh]);

    } catch (error) {
      console.error("Failed to initialize graphics:", error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MunimMetalkitView
        style={{ flex: 1 }}
        preferredFramesPerSecond={60}
        clearColor={{ red: 0.1, green: 0.1, blue: 0.1, alpha: 1.0 }}
        onLoad={() => console.log("MetalKit View Loaded")}
        onRender={({ nativeEvent }) => {
          console.log(`Render: ${nativeEvent.frameTime}ms`);
        }}
        onError={({ nativeEvent }) => {
          console.error(`MetalKit Error: ${nativeEvent.error}`);
        }}
        scene={{
          meshes: meshes,
          materials: [],
          animations: [],
          ambientLightColor: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1.0 },
          directionalLightColor: { red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0 },
          directionalLightDirection: { x: 0, y: -1, z: 0 },
        }}
        camera={{
          position: { x: 0, y: 0, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          up: { x: 0, y: 1, z: 0 },
          fov: 45,
          near: 0.1,
          far: 100,
          aspectRatio: 1.0,
        }}
        lighting={{
          ambientColor: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1.0 },
          directionalColor: { red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0 },
          directionalDirection: { x: 0, y: -1, z: 0 },
          pointLights: [],
          spotLights: [],
        }}
      />
    </View>
  );
}
```

## 🔧 API Reference

### Core Functions

#### `isMetalAvailable()`

Checks if Metal is available on the current device.

**Returns:** `boolean`

#### `getDeviceInfo()`

Returns device information including GPU capabilities.

**Returns:** `Promise<{ name: string; maxThreadsPerGroup: number; maxThreadgroupMemoryLength: number }>`

### Texture Management

#### `createTexture(descriptor)`

Creates a new texture with the specified descriptor.

**Parameters:**

- `descriptor` (TextureDescriptor): Texture configuration

**Returns:** `Promise<Texture>`

#### `loadTextureFromURL(url)`

Loads a texture from a URL.

**Parameters:**

- `url` (string): Image URL

**Returns:** `Promise<Texture>`

#### `updateTexture(textureId, data, region)`

Updates a texture with new data.

**Parameters:**

- `textureId` (string): Texture identifier
- `data` (ArrayBuffer): New texture data
- `region` (object): Update region coordinates

**Returns:** `Promise<void>`

### Buffer Management

#### `createBuffer(descriptor)`

Creates a new buffer with the specified descriptor.

**Parameters:**

- `descriptor` (BufferDescriptor): Buffer configuration

**Returns:** `Promise<Buffer>`

#### `createBufferWithData(data, options)`

Creates a buffer with initial data.

**Parameters:**

- `data` (ArrayBuffer): Initial buffer data
- `options` (string): Buffer options

**Returns:** `Promise<Buffer>`

### Shader Management

#### `createRenderPipelineState(descriptor)`

Creates a render pipeline state.

**Parameters:**

- `descriptor` (ShaderDescriptor): Shader configuration

**Returns:** `Promise<RenderPipelineState>`

### Mesh Management

#### `createMesh(descriptor)`

Creates a new mesh with the specified descriptor.

**Parameters:**

- `descriptor` (MeshDescriptor): Mesh configuration

**Returns:** `Promise<Mesh>`

#### `loadMeshFromURL(url)`

Loads a mesh from a URL.

**Parameters:**

- `url` (string): Mesh file URL

**Returns:** `Promise<Mesh>`

### Animation Management

#### `createAnimation(descriptor)`

Creates a new animation.

**Parameters:**

- `descriptor` (AnimationDescriptor): Animation configuration

**Returns:** `Promise<Animation>`

#### `startAnimation(animationId)`

Starts an animation.

**Parameters:**

- `animationId` (string): Animation identifier

**Returns:** `Promise<void>`

### Rendering Control

#### `startRendering()`

Starts the rendering loop.

**Returns:** `Promise<void>`

#### `stopRendering()`

Stops the rendering loop.

**Returns:** `Promise<void>`

#### `setNeedsDisplay()`

Marks the view as needing a display update.

**Returns:** `Promise<void>`

### Utility Functions

#### `takeScreenshot()`

Takes a screenshot of the current render.

**Returns:** `Promise<ArrayBuffer>`

#### `getPerformanceInfo()`

Gets current performance information.

**Returns:** `Promise<{ frameTime: number; drawCallCount: number; triangleCount: number }>`

## 📖 Usage Examples

### 3D Model Viewer

```typescript
import React, { useEffect, useState } from "react";
import { View, Button, Alert } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

const ModelViewer = () => {
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadModel = async () => {
    setIsLoading(true);
    try {
      const mesh = await MunimMetalkit.loadMeshFromURL(
        "https://example.com/model.obj"
      );
      setModel(mesh);
      Alert.alert("Success", "Model loaded successfully");
    } catch (error) {
      Alert.alert("Error", `Failed to load model: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MunimMetalkitView
        style={{ flex: 1 }}
        scene={{
          meshes: model ? [model] : [],
          materials: [],
          animations: [],
          ambientLightColor: { red: 0.3, green: 0.3, blue: 0.3, alpha: 1.0 },
          directionalLightColor: { red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0 },
          directionalLightDirection: { x: 0, y: -1, z: 0 },
        }}
        camera={{
          position: { x: 0, y: 0, z: 10 },
          target: { x: 0, y: 0, z: 0 },
          up: { x: 0, y: 1, z: 0 },
          fov: 45,
          near: 0.1,
          far: 100,
          aspectRatio: 1.0,
        }}
        onLoad={() => console.log("Model viewer loaded")}
        onRender={({ nativeEvent }) => {
          console.log(`Frame time: ${nativeEvent.frameTime}ms`);
        }}
      />
      <Button
        title={isLoading ? "Loading..." : "Load Model"}
        onPress={loadModel}
        disabled={isLoading}
      />
    </View>
  );
};
```

### Texture Painting App

```typescript
import React, { useState, useRef } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

const TexturePainter = () => {
  const [texture, setTexture] = useState(null);
  const [brushColor, setBrushColor] = useState([255, 0, 0, 255]); // Red
  const viewRef = useRef(null);

  useEffect(() => {
    initializeCanvas();
  }, []);

  const initializeCanvas = async () => {
    try {
      const canvasTexture = await MunimMetalkit.createTexture({
        width: 512,
        height: 512,
        pixelFormat: "RGBA8Unorm",
        usage: "ShaderWrite",
        storageMode: "Private",
      });
      setTexture(canvasTexture);
    } catch (error) {
      console.error("Failed to create canvas:", error);
    }
  };

  const paintPixel = async (x, y) => {
    if (!texture) return;

    try {
      const colorData = new Uint8Array(brushColor);
      await MunimMetalkit.updateTexture(texture.id, colorData.buffer, {
        x: Math.floor(x * 512),
        y: Math.floor(y * 512),
        width: 1,
        height: 1,
      });
    } catch (error) {
      console.error("Failed to paint pixel:", error);
    }
  };

  return (
    <View style={styles.container}>
      <MunimMetalkitView
        ref={viewRef}
        style={styles.canvas}
        scene={{
          meshes: [],
          materials: texture ? [{
            id: "canvas",
            baseColorTexture: texture,
          }] : [],
          animations: [],
        }}
        onTouchStart={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          paintPixel(locationX, locationY);
        }}
        onTouchMove={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          paintPixel(locationX, locationY);
        }}
      />
      <View style={styles.colorPalette}>
        {[
          [255, 0, 0, 255], // Red
          [0, 255, 0, 255], // Green
          [0, 0, 255, 255], // Blue
          [255, 255, 0, 255], // Yellow
          [255, 0, 255, 255], // Magenta
          [0, 255, 255, 255], // Cyan
        ].map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.colorButton, { backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }]}
            onPress={() => setBrushColor(color)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  colorPalette: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#f0f0f0",
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
  },
});
```

### Animation Example

```typescript
import React, { useEffect, useState } from "react";
import { View, Button, Text } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

const AnimatedScene = () => {
  const [animation, setAnimation] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    createAnimation();
  }, []);

  const createAnimation = async () => {
    try {
      const anim = await MunimMetalkit.createAnimation({
        duration: 2.0,
        repeatCount: 0, // Infinite
        autoreverses: true,
        timingFunction: "EaseInEaseOut",
      });
      setAnimation(anim);
    } catch (error) {
      console.error("Failed to create animation:", error);
    }
  };

  const toggleAnimation = async () => {
    if (!animation) return;

    try {
      if (isAnimating) {
        await MunimMetalkit.pauseAnimation(animation.id);
        setIsAnimating(false);
      } else {
        await MunimMetalkit.startAnimation(animation.id);
        setIsAnimating(true);
      }
    } catch (error) {
      console.error("Failed to toggle animation:", error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MunimMetalkitView
        style={{ flex: 1 }}
        scene={{
          meshes: [],
          materials: [],
          animations: animation ? [animation] : [],
          ambientLightColor: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1.0 },
          directionalLightColor: { red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0 },
          directionalLightDirection: { x: 0, y: -1, z: 0 },
        }}
        onAnimationComplete={({ nativeEvent }) => {
          console.log(`Animation ${nativeEvent.animationId} completed: ${nativeEvent.completed}`);
        }}
      />
      <View style={{ padding: 20 }}>
        <Button
          title={isAnimating ? "Pause Animation" : "Start Animation"}
          onPress={toggleAnimation}
        />
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          Animation Status: {isAnimating ? "Running" : "Paused"}
        </Text>
      </View>
    </View>
  );
};
```

### 2D Drawing App

```typescript
import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

const DrawingApp = () => {
  const [canvas, setCanvas] = useState(null);
  const [brushColor, setBrushColor] = useState({ red: 1, green: 0, blue: 0, alpha: 1 });
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    initializeCanvas();
  }, []);

  const initializeCanvas = async () => {
    try {
      // Create a 2D canvas
      const canvas2D = await MunimMetalkit.createCanvas2D(800, 600);
      setCanvas(canvas2D);

      // Clear with white background
      await MunimMetalkit.clearCanvas2D(canvas2D.id, { red: 1, green: 1, blue: 1, alpha: 1 });

      // Create initial layer
      await MunimMetalkit.createDrawingLayer(canvas2D.id, "Background");
    } catch (error) {
      console.error("Failed to initialize canvas:", error);
    }
  };

  const handleTouchMove = async (event) => {
    if (!canvas) return;

    const { locationX, locationY } = event.nativeEvent;
    await MunimMetalkit.setCanvas2DPixel(canvas.id, locationX, locationY, brushColor);
  };

  const drawLine = async () => {
    if (!canvas) return;

    await MunimMetalkit.drawLine2D(
      canvas.id,
      { x: 100, y: 100 },
      { x: 300, y: 200 },
      {
        color: brushColor,
        width: brushSize,
        capStyle: "round",
        joinStyle: "round",
      }
    );
  };

  const drawRectangle = async () => {
    if (!canvas) return;

    await MunimMetalkit.drawRectangle2D(
      canvas.id,
      { x: 150, y: 150, width: 200, height: 100 },
      {
        color: brushColor,
        pattern: "solid",
      }
    );
  };

  const drawCircle = async () => {
    if (!canvas) return;

    await MunimMetalkit.drawCircle2D(
      canvas.id,
      { center: { x: 400, y: 300 }, radius: 80 },
      {
        color: brushColor,
        pattern: "solid",
      }
    );
  };

  const drawText = async () => {
    if (!canvas) return;

    await MunimMetalkit.drawText2D(
      canvas.id,
      "Hello MetalKit!",
      { x: 200, y: 400 },
      {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: "bold",
        color: brushColor,
        alignment: "center",
        baseline: "middle",
      }
    );
  };

  const clearCanvas = async () => {
    if (!canvas) return;
    await MunimMetalkit.clearCanvas2D(canvas.id, { red: 1, green: 1, blue: 1, alpha: 1 });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MetalKit 2D Drawing App</Text>
      
      {/* Drawing Canvas */}
      <View style={styles.canvasContainer}>
        <MunimMetalkitView
          style={styles.canvas}
          onTouchMove={handleTouchMove}
          scene={{
            meshes: canvas ? [{
              id: "canvas",
              vertexBuffers: [],
              vertexCount: 4,
              primitiveType: "Triangle",
            }] : [],
            materials: canvas ? [{
              id: "canvasMaterial",
              baseColorTexture: canvas.texture,
            }] : [],
            animations: [],
          }}
        />
      </View>

      {/* Color Palette */}
      <View style={styles.colorPalette}>
        {[
          { red: 1, green: 0, blue: 0, alpha: 1 }, // Red
          { red: 0, green: 1, blue: 0, alpha: 1 }, // Green
          { red: 0, green: 0, blue: 1, alpha: 1 }, // Blue
          { red: 1, green: 1, blue: 0, alpha: 1 }, // Yellow
        ].map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorButton,
              {
                backgroundColor: `rgb(${color.red * 255}, ${color.green * 255}, ${color.blue * 255})`,
                borderWidth: brushColor.red === color.red ? 3 : 1,
              },
            ]}
            onPress={() => setBrushColor(color)}
          />
        ))}
      </View>

      {/* Drawing Tools */}
      <View style={styles.toolsRow}>
        <TouchableOpacity style={styles.toolButton} onPress={drawLine}>
          <Text style={styles.toolButtonText}>Line</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={drawRectangle}>
          <Text style={styles.toolButtonText}>Rectangle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={drawCircle}>
          <Text style={styles.toolButtonText}>Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={drawText}>
          <Text style={styles.toolButtonText}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={clearCanvas}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  canvasContainer: {
    height: 300,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
  },
  canvas: {
    flex: 1,
    borderRadius: 10,
  },
  colorPalette: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: "#ccc",
  },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  toolButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  toolButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  clearButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Metal Not Available**: Ensure you're running on a device that supports Metal (iOS 8+)
2. **Performance Issues**: Check your rendering settings and reduce texture sizes if needed
3. **Memory Warnings**: Monitor texture and buffer usage, release unused resources
4. **Build Errors**: Ensure you have the correct iOS/Android SDK versions

### Expo-Specific Issues

1. **Development Build Required**: This library requires a development build in Expo. Use `npx expo run:ios` or `npx expo run:android`
2. **Permissions Not Working**: Make sure you've added the permissions to your `app.json` as shown in the setup section
3. **Build Errors**: Ensure you're using Expo SDK 50+ and have the latest Expo CLI

### Debug Mode

Enable debug logging by setting the following environment variable:

```bash
export REACT_NATIVE_METALKIT_DEBUG=1
```

### Performance Optimization

1. **Use Appropriate Texture Sizes**: Don't use textures larger than necessary
2. **Batch Draw Calls**: Group similar objects together
3. **Use Mipmaps**: Enable mipmaps for textures that will be viewed at different distances
4. **Monitor Performance**: Use `getPerformanceInfo()` to track frame times and draw calls

## Platform Support

### iOS

- Uses native MetalKit for maximum performance
- Full GPU acceleration
- Supports all MetalKit features
- Requires iOS 8.0+

### Android

- Uses OpenGL ES for rendering
- Equivalent functionality to iOS
- Optimized for mobile GPUs
- Requires API level 21+

### Web

- Uses WebGL for rendering
- Fallback implementation
- Good performance in modern browsers
- Requires WebGL support

## 👏 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<img alt="Star the Munim Technologies repo on GitHub to support the project" src="https://user-images.githubusercontent.com/9664363/185428788-d762fd5d-97b3-4f59-8db7-f72405be9677.gif" width="50%">
