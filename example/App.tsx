import { useEvent } from "expo";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";
import {
  Button,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useState, useEffect } from "react";

export default function App() {
  const onChangePayload = useEvent(MunimMetalkit, "onChange");
  const onRenderPayload = useEvent(MunimMetalkit, "onRender");
  const onErrorPayload = useEvent(MunimMetalkit, "onError");
  const onAnimationCompletePayload = useEvent(
    MunimMetalkit,
    "onAnimationComplete"
  );

  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isMetalAvailable, setIsMetalAvailable] = useState(false);
  const [performanceInfo, setPerformanceInfo] = useState<any>(null);
  const [textures, setTextures] = useState<any[]>([]);
  const [meshes, setMeshes] = useState<any[]>([]);
  const [animations, setAnimations] = useState<any[]>([]);

  useEffect(() => {
    initializeMetalKit();
  }, []);

  const initializeMetalKit = async () => {
    try {
      const available = MunimMetalkit.isMetalAvailable();
      setIsMetalAvailable(available);

      if (available) {
        const info = await MunimMetalkit.getDeviceInfo();
        setDeviceInfo(info);
      }
    } catch (error) {
      console.error("Failed to initialize MetalKit:", error);
    }
  };

  const createTexture = async () => {
    try {
      const texture = await MunimMetalkit.createTexture({
        width: 256,
        height: 256,
        pixelFormat: "RGBA8Unorm",
        usage: "ShaderRead",
        mipmapLevelCount: 1,
        sampleCount: 1,
        arrayLength: 1,
        depth: 1,
        storageMode: "Private",
      });
      setTextures((prev) => [...prev, texture]);
      Alert.alert("Success", `Created texture: ${texture.id}`);
    } catch (error) {
      Alert.alert("Error", `Failed to create texture: ${error}`);
    }
  };

  const loadTextureFromURL = async () => {
    try {
      const texture = await MunimMetalkit.loadTextureFromURL(
        "https://picsum.photos/256/256"
      );
      setTextures((prev) => [...prev, texture]);
      Alert.alert("Success", `Loaded texture from URL: ${texture.id}`);
    } catch (error) {
      Alert.alert("Error", `Failed to load texture from URL: ${error}`);
    }
  };

  const createMesh = async () => {
    try {
      const buffer = await MunimMetalkit.createBuffer({
        length: 1024,
        options: "StorageModePrivate",
      });

      const mesh = await MunimMetalkit.createMesh({
        vertexBuffers: [buffer],
        vertexCount: 3,
        primitiveType: "Triangle",
      });
      setMeshes((prev) => [...prev, mesh]);
      Alert.alert("Success", `Created mesh: ${mesh.id}`);
    } catch (error) {
      Alert.alert("Error", `Failed to create mesh: ${error}`);
    }
  };

  const createAnimation = async () => {
    try {
      const animation = await MunimMetalkit.createAnimation({
        duration: 2.0,
        repeatCount: 1,
        autoreverses: false,
        timingFunction: "EaseInEaseOut",
      });
      setAnimations((prev) => [...prev, animation]);
      Alert.alert("Success", `Created animation: ${animation.id}`);
    } catch (error) {
      Alert.alert("Error", `Failed to create animation: ${error}`);
    }
  };

  const startAnimation = async (animationId: string) => {
    try {
      await MunimMetalkit.startAnimation(animationId);
      Alert.alert("Success", `Started animation: ${animationId}`);
    } catch (error) {
      Alert.alert("Error", `Failed to start animation: ${error}`);
    }
  };

  const getPerformanceInfo = async () => {
    try {
      const info = await MunimMetalkit.getPerformanceInfo();
      setPerformanceInfo(info);
    } catch (error) {
      Alert.alert("Error", `Failed to get performance info: ${error}`);
    }
  };

  const takeScreenshot = async () => {
    try {
      const screenshot = await MunimMetalkit.takeScreenshot();
      Alert.alert(
        "Success",
        `Screenshot taken: ${screenshot.byteLength} bytes`
      );
    } catch (error) {
      Alert.alert("Error", `Failed to take screenshot: ${error}`);
    }
  };

  const createRenderPipeline = async () => {
    try {
      const pipeline = await MunimMetalkit.createRenderPipelineState({
        vertexFunction: "vertex_main",
        fragmentFunction: "fragment_main",
        colorAttachments: [
          {
            pixelFormat: "RGBA8Unorm",
            isBlendingEnabled: false,
            rgbBlendOperation: "Add",
            alphaBlendOperation: "Add",
            sourceRGBBlendFactor: "One",
            sourceAlphaBlendFactor: "One",
            destinationRGBBlendFactor: "Zero",
            destinationAlphaBlendFactor: "Zero",
            writeMask: "All",
          },
        ],
        depthAttachmentPixelFormat: "Depth32Float",
        sampleCount: 1,
        rasterSampleCount: 1,
        alphaToCoverageEnabled: false,
        alphaToOneEnabled: false,
        rasterizationEnabled: true,
      });
      Alert.alert("Success", `Created render pipeline: ${pipeline.id}`);
    } catch (error) {
      Alert.alert("Error", `Failed to create render pipeline: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>MetalKit React Native Package</Text>

        <Group name="Device Information">
          <Text>Metal Available: {isMetalAvailable ? "Yes" : "No"}</Text>
          {deviceInfo && (
            <>
              <Text>Device Name: {deviceInfo.name}</Text>
              <Text>
                Max Threads Per Group: {deviceInfo.maxThreadsPerGroup}
              </Text>
              <Text>
                Max Threadgroup Memory: {deviceInfo.maxThreadgroupMemoryLength}
              </Text>
            </>
          )}
        </Group>

        <Group name="Basic Functions">
          <Text>PI: {MunimMetalkit.PI}</Text>
          <Text>Hello: {MunimMetalkit.hello()}</Text>
          <Button
            title="Set Value"
            onPress={async () => {
              await MunimMetalkit.setValueAsync("Hello from MetalKit!");
            }}
          />
        </Group>

        <Group name="Texture Management">
          <Button title="Create Texture" onPress={createTexture} />
          <Button title="Load Texture from URL" onPress={loadTextureFromURL} />
          <Text>Textures: {textures.length}</Text>
          {textures.map((texture, index) => (
            <Text key={index} style={styles.itemText}>
              Texture {index + 1}: {texture.id} ({texture.width}x
              {texture.height})
            </Text>
          ))}
        </Group>

        <Group name="Mesh Management">
          <Button title="Create Mesh" onPress={createMesh} />
          <Text>Meshes: {meshes.length}</Text>
          {meshes.map((mesh, index) => (
            <Text key={index} style={styles.itemText}>
              Mesh {index + 1}: {mesh.id} ({mesh.vertexCount} vertices)
            </Text>
          ))}
        </Group>

        <Group name="Animation Management">
          <Button title="Create Animation" onPress={createAnimation} />
          <Text>Animations: {animations.length}</Text>
          {animations.map((animation, index) => (
            <View key={index} style={styles.animationItem}>
              <Text style={styles.itemText}>
                Animation {index + 1}: {animation.id} ({animation.duration}s)
              </Text>
              <Button
                title="Start"
                onPress={() => startAnimation(animation.id)}
                style={styles.smallButton}
              />
            </View>
          ))}
        </Group>

        <Group name="Rendering Pipeline">
          <Button
            title="Create Render Pipeline"
            onPress={createRenderPipeline}
          />
        </Group>

        <Group name="Performance & Utilities">
          <Button title="Get Performance Info" onPress={getPerformanceInfo} />
          <Button title="Take Screenshot" onPress={takeScreenshot} />
          {performanceInfo && (
            <>
              <Text>Frame Time: {performanceInfo.frameTime}ms</Text>
              <Text>Draw Calls: {performanceInfo.drawCallCount}</Text>
              <Text>Triangles: {performanceInfo.triangleCount}</Text>
            </>
          )}
        </Group>

        <Group name="Events">
          <Text>Last Change: {onChangePayload?.value || "None"}</Text>
          <Text>Render Events: {onRenderPayload ? "Active" : "None"}</Text>
          <Text>Errors: {onErrorPayload ? onErrorPayload.error : "None"}</Text>
          <Text>
            Animation Complete:{" "}
            {onAnimationCompletePayload
              ? onAnimationCompletePayload.animationId
              : "None"}
          </Text>
        </Group>

        <Group name="MetalKit View">
          <MunimMetalkitView
            style={styles.metalView}
            preferredFramesPerSecond={60}
            enableSetNeedsDisplay={true}
            autoResizeDrawable={true}
            colorPixelFormat="BGRA8Unorm"
            depthStencilPixelFormat="Depth32Float"
            sampleCount={1}
            clearColor={{ red: 0.2, green: 0.3, blue: 0.8, alpha: 1.0 }}
            onLoad={({ nativeEvent: { url } }) =>
              console.log(`MetalKit View Loaded: ${url}`)
            }
            onRender={({ nativeEvent: { frameTime, drawableCount } }) => {
              console.log(
                `Render: ${frameTime}ms, Drawables: ${drawableCount}`
              );
            }}
            onError={({ nativeEvent: { error, code } }) => {
              console.error(`MetalKit Error: ${error} (${code})`);
            }}
            onAnimationComplete={({
              nativeEvent: { animationId, completed },
            }) => {
              console.log(
                `Animation Complete: ${animationId}, Completed: ${completed}`
              );
            }}
            scene={{
              meshes: meshes,
              textures: textures,
              materials: [],
              animations: animations,
              ambientLightColor: {
                red: 0.2,
                green: 0.2,
                blue: 0.2,
                alpha: 1.0,
              },
              directionalLightColor: {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
                alpha: 1.0,
              },
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
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 30,
    margin: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  groupHeader: {
    fontSize: 20,
    marginBottom: 15,
    fontWeight: "600",
    color: "#333",
  },
  group: {
    margin: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  metalView: {
    height: 300,
    borderRadius: 10,
    overflow: "hidden",
  },
  itemText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  animationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
