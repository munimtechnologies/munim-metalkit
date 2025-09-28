import * as React from "react";
import { ViewStyle } from "react-native";

import { MunimMetalkitViewProps } from "./MunimMetalkit.types";

export default function MunimMetalkitView(props: MunimMetalkitViewProps) {
  const {
    style,
    preferredFramesPerSecond = 60,
    autoResizeDrawable = true,
    drawableSize,
    clearColor = { red: 0, green: 0, blue: 0, alpha: 1 },
    onLoad,
    onRender,
    onError,
  } = props;

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const glRef = React.useRef<
    WebGLRenderingContext | WebGL2RenderingContext | null
  >(null);
  const animationFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      onError?.({ nativeEvent: { error: "WebGL not supported", code: -1 } });
      return;
    }

    glRef.current = gl;

    // Set up WebGL context
    gl.clearColor(
      clearColor.red,
      clearColor.green,
      clearColor.blue,
      clearColor.alpha
    );
    gl.enable(gl.DEPTH_TEST);

    // Set canvas size
    if (drawableSize) {
      canvas.width = drawableSize.width;
      canvas.height = drawableSize.height;
    } else if (autoResizeDrawable) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    }

    onLoad?.({ nativeEvent: { url: "webgl-canvas" } });

    // Start render loop
    const render = () => {
      if (!gl) return;

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Render basic scene
      renderBasicScene(gl);

      // Send render event
      onRender?.({ nativeEvent: { frameTime: 16.67, drawableCount: 1 } });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    preferredFramesPerSecond,
    clearColor,
    drawableSize,
    autoResizeDrawable,
    onLoad,
    onRender,
    onError,
  ]);

  const renderBasicScene = (
    gl: WebGLRenderingContext | WebGL2RenderingContext
  ) => {
    // Basic triangle rendering
    const vertices = new Float32Array([
      0.0, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0,
    ]);

    const colors = new Float32Array([
      1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    ]);

    // Create and bind vertex buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Create and bind color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    // Simple shader program
    const vertexShaderSource = `
      attribute vec3 position;
      attribute vec4 color;
      varying vec4 vColor;
      
      void main() {
        vColor = color;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        gl_FragColor = vColor;
      }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    gl.useProgram(program);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, "position");
    const colorLocation = gl.getAttribLocation(program, "color");

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

    // Draw triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const createShader = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const createProgram = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShader: WebGLShader | null,
    fragmentShader: WebGLShader | null
  ): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program || !vertexShader || !fragmentShader) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  const defaultStyle: ViewStyle = {
    flex: 1,
    backgroundColor: "transparent",
  };

  return (
    <div style={{ ...defaultStyle, ...(style as any) }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
