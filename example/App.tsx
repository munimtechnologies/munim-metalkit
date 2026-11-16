import MunimMetalkit, {
  MunimMetalkitView,
  type MunimMetalkitViewRef,
} from "munim-metalkit";
import { File, Paths } from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { runBenchmark, type BenchmarkResult } from "./benchmark";
import {
  createCustomShader,
  WAVE_SIZE,
  type CustomShaderResources,
} from "./customShader";
import {
  runSelfTest,
  type CustomViewHandle,
  type SelfTestArtifacts,
  type SelfTestReport,
} from "./selftest";

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  let resolve = () => {};
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Resolves when `signal` resolves, or with null after 5 s. */
async function within<T>(signal: Promise<void>, value: () => T) {
  const timeout = new Promise<"timeout">((r) =>
    setTimeout(() => r("timeout"), 5000),
  );
  const result = await Promise.race([signal, timeout]);
  return result === "timeout" ? null : value();
}

const TINTS: [string, [number, number, number]][] = [
  ["White", [1, 1, 1]],
  ["Warm", [1, 0.6, 0.3]],
  ["Cool", [0.4, 0.7, 1]],
];

function writeFile(name: string, contents: string) {
  // Also written to Documents so device runs can be read back without
  // Metro (e.g. `devicectl device copy from --domain-type appDataContainer`).
  try {
    const file = new File(Paths.document, name);
    if (file.exists) file.delete();
    file.create();
    file.writeSync(contents);
  } catch (error) {
    console.warn(`could not write ${name}`, error);
  }
}

export default function App() {
  const available = MunimMetalkit.isMetalAvailable();
  const viewRef = useRef<MunimMetalkitViewRef>(null);
  const customRef = useRef<MunimMetalkitViewRef>(null);
  const loaded = useRef<Deferred | null>(null);
  const customLoaded = useRef<Deferred | null>(null);
  if (!loaded.current) loaded.current = deferred();
  if (!customLoaded.current) customLoaded.current = deferred();

  const [report, setReport] = useState<SelfTestReport | null>(null);
  const [artifacts, setArtifacts] = useState<SelfTestArtifacts>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [viewStatus, setViewStatus] = useState("waiting for first frame");
  const [custom, setCustom] = useState<CustomShaderResources | null>(null);
  const [customStatus, setCustomStatus] = useState("setting up");
  const [renderScale, setRenderScale] = useState(1);
  const [bench, setBench] = useState<BenchmarkResult | null>(null);
  const [benchRunning, setBenchRunning] = useState(false);

  // The custom shader's pipelines, texture and buffers live as long as the screen.
  const customResources = useRef<CustomShaderResources | null>(null);
  useEffect(() => {
    if (!available) {
      setCustomStatus("Metal unavailable");
      customLoaded.current!.resolve();
      return;
    }
    let cancelled = false;
    createCustomShader().then(
      (resources) => {
        if (cancelled) {
          resources.release();
          return;
        }
        customResources.current = resources;
        setCustom(resources);
      },
      (error) => setCustomStatus(`setup failed: ${String(error)}`),
    );
    return () => {
      cancelled = true;
      customResources.current?.release();
    };
  }, [available]);

  const getView = useCallback(
    () => within(loaded.current!.promise, () => viewRef.current),
    [],
  );
  const getCustomView = useCallback(
    () =>
      within(
        customLoaded.current!.promise,
        (): CustomViewHandle | null =>
          customRef.current && customResources.current
            ? { ref: customRef.current, resources: customResources.current }
            : null,
      ),
    [],
  );

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runSelfTest(getView, setArtifacts, getCustomView);
      setReport(result);
      console.log(`MUNIM_METALKIT_SELFTEST ${JSON.stringify(result)}`);
      writeFile("munim-metalkit-selftest.json", JSON.stringify(result));
    } finally {
      setRunning(false);
    }
  }, [getView, getCustomView]);

  const benchmark = useCallback(async () => {
    setBenchRunning(true);
    try {
      const result = await runBenchmark();
      setBench(result);
      console.log(`MUNIM_METALKIT_BENCH ${JSON.stringify(result)}`);
      writeFile("munim-metalkit-bench.json", JSON.stringify(result));
    } catch (error) {
      setBench({ error: String(error) });
    } finally {
      setBenchRunning(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>munim-metalkit</Text>
        <Text style={styles.subtitle}>
          Metal available: {String(available)}
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
                `${e.nativeEvent.fps.toFixed(0)} fps, gpu ${e.nativeEvent.gpuFrameTime?.toFixed(3) ?? "?"} ms/frame`,
              )
            }
            onError={(e) => setViewStatus(`error: ${e.nativeEvent.error}`)}
          />
        </View>
        <Text style={styles.mono}>{viewStatus}</Text>
        <Button
          title={paused ? "Resume" : "Pause"}
          onPress={() => setPaused((p) => !p)}
        />

        <Text style={styles.section}>Custom shader (GPU-driven)</Text>
        <Text style={styles.caption}>
          Every frame a compute kernel writes a {WAVE_SIZE}x{WAVE_SIZE} texture
          and a fragment shader samples it. The tint buttons write into mapped
          GPU memory; no native call is made.
        </Text>
        <View style={styles.metalFrame}>
          {custom && (
            <MunimMetalkitView
              ref={customRef}
              style={styles.metal}
              preferredFramesPerSecond={0}
              renderPipelineId={custom.renderPipelineId}
              computePipelineId={custom.computePipelineId}
              computeThreads={{ width: WAVE_SIZE, height: WAVE_SIZE }}
              buffers={[custom.probeBufferId]}
              textures={[custom.textureId]}
              uniformBufferId={custom.uniformBufferId}
              renderScale={renderScale}
              onLoad={() => {
                setCustomStatus("rendering");
                customLoaded.current!.resolve();
              }}
              onRender={(e) =>
                setCustomStatus(
                  `${e.nativeEvent.fps.toFixed(0)} fps, gpu ${e.nativeEvent.gpuFrameTime?.toFixed(3) ?? "?"} ms/frame, render width ${custom.probe[2]}`,
                )
              }
              onError={(e) =>
                setCustomStatus(
                  `${e.nativeEvent.code}: ${e.nativeEvent.error}`,
                )
              }
            />
          )}
        </View>
        <Text style={styles.mono}>{customStatus}</Text>
        <View style={styles.row}>
          {TINTS.map(([name, [r, g, b]]) => (
            <Button
              key={name}
              title={name}
              disabled={!custom}
              onPress={() => custom?.tint.set([r, g, b, 1])}
            />
          ))}
        </View>
        <Button
          title={
            renderScale < 1
              ? "Render at full size"
              : "Render at 50% + MetalFX upscale"
          }
          disabled={!custom}
          onPress={() => setRenderScale((s) => (s < 1 ? 1 : 0.5))}
        />

        {artifacts.computeSample && (
          <>
            <Text style={styles.section}>Compute: double on the GPU</Text>
            <Text style={styles.mono}>
              in: [{artifacts.computeSample.input.join(", ")}, ...]
            </Text>
            <Text style={styles.mono}>
              out: [{artifacts.computeSample.output.join(", ")}, ...]
            </Text>
            <Text style={styles.mono}>
              gpu time: {artifacts.computeSample.gpuTimeMs?.toFixed(3) ?? "n/a"}{" "}
              ms
            </Text>
          </>
        )}

        {artifacts.texturePixels && (
          <>
            <Text style={styles.section}>Texture read back (first 2 texels)</Text>
            <Text style={styles.mono}>[{artifacts.texturePixels.join(", ")}]</Text>
          </>
        )}

        {[artifacts.screenshot, artifacts.customScreenshot].map(
          (shot, index) =>
            shot?.base64 && (
              <View key={index}>
                <Text style={styles.section}>
                  Screenshot {index === 0 ? "(built-in)" : "(custom)"} (
                  {shot.width}x{shot.height})
                </Text>
                <Image
                  source={{ uri: `data:image/png;base64,${shot.base64}` }}
                  style={styles.screenshot}
                  resizeMode="contain"
                />
              </View>
            ),
        )}

        <Text style={styles.section}>Benchmark</Text>
        <Button
          title={benchRunning ? "Running..." : "Run benchmark"}
          disabled={benchRunning || !available}
          onPress={benchmark}
        />
        {bench &&
          Object.entries(bench).map(([name, value]) => (
            <Text key={name} style={styles.mono}>
              {name}: {value}
            </Text>
          ))}

        <Text style={styles.section}>
          Self-test{" "}
          {report
            ? `${report.passed} passed, ${report.failed} failed`
            : running
              ? "running..."
              : ""}
        </Text>
        {report &&
          Object.entries(report.checks).map(([name, result]) => (
            <Text key={name} style={[styles.check, !result.ok && styles.fail]}>
              {result.ok ? "PASS" : "FAIL"} {name}: {result.detail}
            </Text>
          ))}
        <Button
          title="Run self-test again"
          disabled={running}
          onPress={run}
        />
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
  caption: { fontSize: 13, color: "#555" },
  row: { flexDirection: "row", justifyContent: "space-around" },
  metalFrame: {
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  metal: { flex: 1 },
  screenshot: { height: 160, backgroundColor: "#000", borderRadius: 8 },
  mono: { fontFamily: mono, fontSize: 12 },
  check: { fontFamily: mono, fontSize: 12, color: "#1a7f37" },
  fail: { color: "#cf222e" },
});
