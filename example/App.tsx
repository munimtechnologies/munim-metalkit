import MunimMetalkit, { MunimMetalkitView, type MunimMetalkitViewRef } from "munim-metalkit";
import { File, Paths } from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { runSelfTest, type SelfTestArtifacts, type SelfTestReport } from "./selftest";

export default function App() {
  const viewRef = useRef<MunimMetalkitViewRef>(null);
  const loaded = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!loaded.current) {
    let resolve = () => {};
    const promise = new Promise<void>((r) => (resolve = r));
    loaded.current = { promise, resolve };
  }

  const [report, setReport] = useState<SelfTestReport | null>(null);
  const [artifacts, setArtifacts] = useState<SelfTestArtifacts>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [viewStatus, setViewStatus] = useState("waiting for first frame");

  const getView = useCallback(async () => {
    const timeout = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 5000));
    const result = await Promise.race([loaded.current!.promise, timeout]);
    return result === "timeout" ? null : viewRef.current;
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runSelfTest(getView, setArtifacts);
      setReport(result);
      console.log(`MUNIM_METALKIT_SELFTEST ${JSON.stringify(result)}`);
      // Also written to Documents so device runs can be read back without
      // Metro (e.g. `devicectl device copy from --domain-type appDataContainer`).
      try {
        const file = new File(Paths.document, "munim-metalkit-selftest.json");
        if (file.exists) file.delete();
        file.create();
        file.write(JSON.stringify(result));
      } catch (error) {
        console.warn("could not write the self-test result file", error);
      }
    } finally {
      setRunning(false);
    }
  }, [getView]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.title}>munim-metalkit</Text>
        <Text style={styles.subtitle}>
          Metal available: {String(MunimMetalkit.isMetalAvailable())}
        </Text>

        <Text style={styles.section}>MTKView (built-in shader)</Text>
        <View style={styles.metalFrame}>
          <MunimMetalkitView
            ref={viewRef}
            style={styles.metal}
            paused={paused}
            clearColor={{ red: 0.08, green: 0.08, blue: 0.12, alpha: 1 }}
            onLoad={(e) => {
              setViewStatus(`rendering on ${e.nativeEvent.deviceName}`);
              loaded.current!.resolve();
            }}
            onRender={(e) =>
              setViewStatus(
                `${e.nativeEvent.fps.toFixed(0)} fps, gpu ${e.nativeEvent.gpuFrameTime?.toFixed(3) ?? "?"} ms/frame`
              )
            }
            onError={(e) => setViewStatus(`error: ${e.nativeEvent.error}`)}
          />
        </View>
        <Text style={styles.mono}>{viewStatus}</Text>
        <Button title={paused ? "Resume" : "Pause"} onPress={() => setPaused((p) => !p)} />

        {artifacts.computeSample && (
          <>
            <Text style={styles.section}>Compute: double on the GPU</Text>
            <Text style={styles.mono}>in:  [{artifacts.computeSample.input.join(", ")}, ...]</Text>
            <Text style={styles.mono}>out: [{artifacts.computeSample.output.join(", ")}, ...]</Text>
            <Text style={styles.mono}>
              gpu time: {artifacts.computeSample.gpuTimeMs?.toFixed(3) ?? "n/a"} ms
            </Text>
          </>
        )}

        {artifacts.texturePixels && (
          <>
            <Text style={styles.section}>Texture read back (first 2 texels)</Text>
            <Text style={styles.mono}>[{artifacts.texturePixels.join(", ")}]</Text>
          </>
        )}

        {artifacts.screenshot?.base64 && (
          <>
            <Text style={styles.section}>
              Screenshot ({artifacts.screenshot.width}x{artifacts.screenshot.height})
            </Text>
            <Image
              source={{ uri: `data:image/png;base64,${artifacts.screenshot.base64}` }}
              style={styles.screenshot}
              resizeMode="contain"
            />
          </>
        )}

        <Text style={styles.section}>
          Self-test{" "}
          {report ? `${report.passed} passed, ${report.failed} failed` : running ? "running..." : ""}
        </Text>
        {report &&
          Object.entries(report.checks).map(([name, result]) => (
            <Text key={name} style={[styles.check, !result.ok && styles.fail]}>
              {result.ok ? "PASS" : "FAIL"} {name}: {result.detail}
            </Text>
          ))}
        <Button title="Run self-test again" disabled={running} onPress={run} />
      </ScrollView>
    </View>
  );
}

const mono = Platform.select({ ios: "Menlo", default: "monospace" });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f4f6" },
  container: { padding: 16, paddingTop: 64, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#555" },
  section: { fontSize: 17, fontWeight: "600", marginTop: 16 },
  metalFrame: { height: 240, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  metal: { flex: 1 },
  screenshot: { height: 160, backgroundColor: "#000", borderRadius: 8 },
  mono: { fontFamily: mono, fontSize: 12 },
  check: { fontFamily: mono, fontSize: 12, color: "#1a7f37" },
  fail: { color: "#cf222e" },
});
