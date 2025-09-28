import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import MunimMetalkit, { MunimMetalkitView } from "munim-metalkit";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function DrawingApp() {
  const [canvas, setCanvas] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState({ red: 1, green: 0, blue: 0, alpha: 1 });
  const [drawingMode, setDrawingMode] = useState<"brush" | "line" | "rectangle" | "circle" | "text">("brush");
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const colors = [
    { red: 1, green: 0, blue: 0, alpha: 1 }, // Red
    { red: 0, green: 1, blue: 0, alpha: 1 }, // Green
    { red: 0, green: 0, blue: 1, alpha: 1 }, // Blue
    { red: 1, green: 1, blue: 0, alpha: 1 }, // Yellow
    { red: 1, green: 0, blue: 1, alpha: 1 }, // Magenta
    { red: 0, green: 1, blue: 1, alpha: 1 }, // Cyan
    { red: 0, green: 0, blue: 0, alpha: 1 }, // Black
    { red: 1, green: 1, blue: 1, alpha: 1 }, // White
  ];

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
      const layer = await MunimMetalkit.createDrawingLayer(canvas2D.id, "Background");
      setLayers([layer]);
      setActiveLayer(layer.id);

      Alert.alert("Success", "Drawing canvas initialized!");
    } catch (error) {
      Alert.alert("Error", `Failed to initialize canvas: ${error}`);
    }
  };

  const handleTouchStart = async (event: any) => {
    if (!canvas) return;

    const { locationX, locationY } = event.nativeEvent;
    setIsDrawing(true);

    if (drawingMode === "brush") {
      await MunimMetalkit.setCanvas2DPixel(canvas.id, locationX, locationY, brushColor);
    }
  };

  const handleTouchMove = async (event: any) => {
    if (!canvas || !isDrawing) return;

    const { locationX, locationY } = event.nativeEvent;

    if (drawingMode === "brush") {
      await MunimMetalkit.setCanvas2DPixel(canvas.id, locationX, locationY, brushColor);
    }
  };

  const handleTouchEnd = async () => {
    setIsDrawing(false);
  };

  const drawLine = async () => {
    if (!canvas) return;

    try {
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
    } catch (error) {
      Alert.alert("Error", `Failed to draw line: ${error}`);
    }
  };

  const drawRectangle = async () => {
    if (!canvas) return;

    try {
      await MunimMetalkit.drawRectangle2D(
        canvas.id,
        { x: 150, y: 150, width: 200, height: 100 },
        {
          color: brushColor,
          pattern: "solid",
        }
      );
    } catch (error) {
      Alert.alert("Error", `Failed to draw rectangle: ${error}`);
    }
  };

  const drawCircle = async () => {
    if (!canvas) return;

    try {
      await MunimMetalkit.drawCircle2D(
        canvas.id,
        { center: { x: 400, y: 300 }, radius: 80 },
        {
          color: brushColor,
          pattern: "solid",
        }
      );
    } catch (error) {
      Alert.alert("Error", `Failed to draw circle: ${error}`);
    }
  };

  const drawText = async () => {
    if (!canvas) return;

    try {
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
    } catch (error) {
      Alert.alert("Error", `Failed to draw text: ${error}`);
    }
  };

  const clearCanvas = async () => {
    if (!canvas) return;

    try {
      await MunimMetalkit.clearCanvas2D(canvas.id, { red: 1, green: 1, blue: 1, alpha: 1 });
      Alert.alert("Success", "Canvas cleared!");
    } catch (error) {
      Alert.alert("Error", `Failed to clear canvas: ${error}`);
    }
  };

  const exportCanvas = async () => {
    if (!canvas) return;

    try {
      const imageData = await MunimMetalkit.exportCanvas2D(canvas.id, "png");
      Alert.alert("Success", `Canvas exported! Size: ${imageData.byteLength} bytes`);
    } catch (error) {
      Alert.alert("Error", `Failed to export canvas: ${error}`);
    }
  };

  const createNewLayer = async () => {
    if (!canvas) return;

    try {
      const layer = await MunimMetalkit.createDrawingLayer(canvas.id, `Layer ${layers.length + 1}`);
      setLayers(prev => [...prev, layer]);
      setActiveLayer(layer.id);
      Alert.alert("Success", `Created new layer: ${layer.name}`);
    } catch (error) {
      Alert.alert("Error", `Failed to create layer: ${error}`);
    }
  };

  const ColorButton = ({ color, onPress, isSelected }: { color: any; onPress: () => void; isSelected: boolean }) => (
    <TouchableOpacity
      style={[
        styles.colorButton,
        {
          backgroundColor: `rgb(${color.red * 255}, ${color.green * 255}, ${color.blue * 255})`,
          borderWidth: isSelected ? 3 : 1,
          borderColor: isSelected ? "#000" : "#ccc",
        },
      ]}
      onPress={onPress}
    />
  );

  const ToolButton = ({ title, mode, onPress }: { title: string; mode: string; onPress: () => void }) => (
    <TouchableOpacity
      style={[
        styles.toolButton,
        { backgroundColor: drawingMode === mode ? "#007AFF" : "#f0f0f0" },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.toolButtonText, { color: drawingMode === mode ? "white" : "black" }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MetalKit 2D Drawing App</Text>
      
      {/* Drawing Canvas */}
      <View style={styles.canvasContainer}>
        <MunimMetalkitView
          style={styles.canvas}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
            ambientLightColor: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1.0 },
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
        />
      </View>

      {/* Color Palette */}
      <View style={styles.colorPalette}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorRow}>
          {colors.map((color, index) => (
            <ColorButton
              key={index}
              color={color}
              onPress={() => setBrushColor(color)}
              isSelected={brushColor.red === color.red && brushColor.green === color.green && brushColor.blue === color.blue}
            />
          ))}
        </View>
      </View>

      {/* Brush Size */}
      <View style={styles.brushSizeContainer}>
        <Text style={styles.sectionTitle}>Brush Size: {brushSize}px</Text>
        <View style={styles.brushSizeRow}>
          {[1, 3, 5, 10, 15, 20].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.brushSizeButton,
                { backgroundColor: brushSize === size ? "#007AFF" : "#f0f0f0" },
              ]}
              onPress={() => setBrushSize(size)}
            >
              <Text style={[styles.brushSizeText, { color: brushSize === size ? "white" : "black" }]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Drawing Tools */}
      <View style={styles.toolsContainer}>
        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.toolsRow}>
          <ToolButton title="Brush" mode="brush" onPress={() => setDrawingMode("brush")} />
          <ToolButton title="Line" mode="line" onPress={() => setDrawingMode("line")} />
          <ToolButton title="Rectangle" mode="rectangle" onPress={() => setDrawingMode("rectangle")} />
          <ToolButton title="Circle" mode="circle" onPress={() => setDrawingMode("circle")} />
          <ToolButton title="Text" mode="text" onPress={() => setDrawingMode("text")} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={drawLine}>
          <Text style={styles.actionButtonText}>Draw Line</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={drawRectangle}>
          <Text style={styles.actionButtonText}>Draw Rectangle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={drawCircle}>
          <Text style={styles.actionButtonText}>Draw Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={drawText}>
          <Text style={styles.actionButtonText}>Draw Text</Text>
        </TouchableOpacity>
      </View>

      {/* Layer Management */}
      <View style={styles.layersContainer}>
        <Text style={styles.sectionTitle}>Layers ({layers.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.layersRow}>
            {layers.map((layer) => (
              <TouchableOpacity
                key={layer.id}
                style={[
                  styles.layerButton,
                  { backgroundColor: activeLayer === layer.id ? "#007AFF" : "#f0f0f0" },
                ]}
                onPress={() => setActiveLayer(layer.id)}
              >
                <Text style={[styles.layerButtonText, { color: activeLayer === layer.id ? "white" : "black" }]}>
                  {layer.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addLayerButton} onPress={createNewLayer}>
              <Text style={styles.addLayerButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Canvas Actions */}
      <View style={styles.canvasActionsContainer}>
        <TouchableOpacity style={styles.clearButton} onPress={clearCanvas}>
          <Text style={styles.clearButtonText}>Clear Canvas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={exportCanvas}>
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
    color: "#333",
  },
  canvasContainer: {
    height: 300,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  canvas: {
    flex: 1,
    borderRadius: 10,
  },
  colorPalette: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  brushSizeContainer: {
    marginBottom: 10,
  },
  brushSizeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  brushSizeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  brushSizeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toolsContainer: {
    marginBottom: 10,
  },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginVertical: 2,
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  layersContainer: {
    marginBottom: 10,
  },
  layersRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  layerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  layerButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addLayerButton: {
    backgroundColor: "#34C759",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  addLayerButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  canvasActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  exportButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exportButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
