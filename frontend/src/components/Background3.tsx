import { useRef, useEffect } from "react";
import { AudioAnalysisState } from "@/lib/audioAnalysis";

export const Background3 = () => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onceRef = useRef<boolean>(false);

  useEffect(() => {
    if (canvasRef.current && !onceRef.current) {
      onceRef.current = true;
      setupCanvas(canvasRef.current);
    }
  }, [canvasRef])

  return (
    <div className="fixed w-[100vw] h-[100vh] -z-10">
      <canvas ref={canvasRef} />
    </div>
  );
}


let uResolutionLocation: WebGLUniformLocation | null = null;
let audioLocation: WebGLUniformLocation | null = null;
let timeLocation: WebGLUniformLocation | null = null;

let audioTexture1: WebGLTexture | null = null;
let audioTexture2: WebGLTexture | null = null;
let framebuffer1: WebGLFramebuffer | null = null;
let framebuffer2: WebGLFramebuffer | null = null;

const audioTextureSizeX = 512;
const audioTextureSizeY = 24; // Increased history size for better visualization
const audioData = new Float32Array(audioTextureSizeX);

let shiftProgram: WebGLProgram | null = null;
let uShiftTextureLocation: WebGLUniformLocation | null = null;
let uShiftResolutionLocation: WebGLUniformLocation | null = null;

let mainProgram: WebGLProgram | null = null;

const setupCanvas = (canvas: HTMLCanvasElement) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext("webgl2");
  if (!ctx) {
      return;
  }

  // Enable extensions if needed (usually not for WebGL2 basic features)
  ctx.getExtension("EXT_color_buffer_float");

  mainProgram = createProgram(ctx, vertexShaderSource, fragmentShaderSource);
  uResolutionLocation = ctx.getUniformLocation(mainProgram, "u_resolution");
  audioLocation = ctx.getUniformLocation(mainProgram, "u_audio");
  timeLocation = ctx.getUniformLocation(mainProgram, "u_time");

  shiftProgram = createProgram(ctx, vertexShaderSource, shiftFragmentShaderSource);
  uShiftTextureLocation = ctx.getUniformLocation(shiftProgram, "u_texture");
  uShiftResolutionLocation = ctx.getUniformLocation(shiftProgram, "u_resolution");

  const positionAttributeLocation = ctx.getAttribLocation(mainProgram, "aVertexPosition");
  const shiftPositionAttributeLocation = ctx.getAttribLocation(shiftProgram, "aVertexPosition");

  const positionBuffer = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(vertices), ctx.STATIC_DRAW);

  // Setup attributes for main program
  ctx.useProgram(mainProgram);
  ctx.enableVertexAttribArray(positionAttributeLocation);
  ctx.vertexAttribPointer(positionAttributeLocation, 2, ctx.FLOAT, false, 0, 0);

  // Setup attributes for shift program
  ctx.useProgram(shiftProgram);
  ctx.enableVertexAttribArray(shiftPositionAttributeLocation);
  ctx.vertexAttribPointer(shiftPositionAttributeLocation, 2, ctx.FLOAT, false, 0, 0);

  // Create textures and framebuffers
  audioTexture1 = createDataTexture(ctx);
  audioTexture2 = createDataTexture(ctx);
  framebuffer1 = createFramebuffer(ctx, audioTexture1);
  framebuffer2 = createFramebuffer(ctx, audioTexture2);

  draw(ctx);

  return () => {
    ctx.deleteBuffer(positionBuffer);
    ctx.deleteTexture(audioTexture1);
    ctx.deleteTexture(audioTexture2);
    ctx.deleteFramebuffer(framebuffer1);
    ctx.deleteFramebuffer(framebuffer2);
    ctx.deleteProgram(mainProgram);
    ctx.deleteProgram(shiftProgram);
  }
}

let frameCount = 0;

const draw = (ctx: WebGL2RenderingContext) => {
  frameCount++;
  
  // 1. Shift Step: Read from T1, Write to T2 (via F2)
  // We want to shift the content 'up' or 'down'. 
  // Let's say row 0 is newest. We want to move row 0 to row 1, row 1 to row 2...
  // So we sample at (uv.y - 1/height).
  
  const readTexture = frameCount % 2 === 0 ? audioTexture1 : audioTexture2;
  const writeFramebuffer = frameCount % 2 === 0 ? framebuffer2 : framebuffer1;
  const writeTexture = frameCount % 2 === 0 ? audioTexture2 : audioTexture1;

  if (shiftProgram && writeFramebuffer && readTexture && writeTexture) {
    ctx.useProgram(shiftProgram);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, writeFramebuffer);
    ctx.viewport(0, 0, audioTextureSizeX, audioTextureSizeY);

    ctx.activeTexture(ctx.TEXTURE0);
    ctx.bindTexture(ctx.TEXTURE_2D, readTexture);
    ctx.uniform1i(uShiftTextureLocation, 0);
    ctx.uniform2f(uShiftResolutionLocation, audioTextureSizeX, audioTextureSizeY);

    ctx.drawArrays(ctx.TRIANGLE_FAN, 0, vertices.length / 2);

    // 2. Update Newest Data
    // We write the new audio data into the first row (y=0) of the writeTexture
    if (AudioAnalysisState.dataArray) {
        // We need to make sure we are writing to the correct texture
        ctx.bindTexture(ctx.TEXTURE_2D, writeTexture);

        audioData.fill(0);
        for (let i = 0; i < audioData.length; i++) {
          // let a = 0;
          // for (let j = 5; j < 35; j++) {
          //   const f = 20 + (j / AudioAnalysisState.dataArray.length) * 24_000;
          //   const l = f / 20
          //   const db = AudioAnalysisState.dataArray[j] / 255;
          //   a += Math.sin((i / audioData.length) * Math.PI * 2 * l + j * 10 + frameCount * l * 0.1) * db * 0.01;
          // }
          audioData[i] = AudioAnalysisState.dataArray[i] / 255;
        }

        ctx.texSubImage2D(ctx.TEXTURE_2D, 0, 0, 0, audioTextureSizeX, 1, ctx.RED, ctx.FLOAT, audioData);
    }

    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  }

  // 3. Render Main Scene
  // Use the texture we just wrote to (writeTexture) as the input for the scene
  
  if (mainProgram) {
      ctx.useProgram(mainProgram);
      ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      ctx.activeTexture(ctx.TEXTURE0);
      ctx.bindTexture(ctx.TEXTURE_2D, writeTexture); // Bind the latest state
      ctx.uniform1i(audioLocation, 0);
      ctx.uniform1f(timeLocation, frameCount / 60);
      
      ctx.uniform2f(uResolutionLocation, ctx.canvas.width, ctx.canvas.height);
      
      ctx.clearColor(0, 0, 0, 1);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      
      ctx.drawArrays(ctx.TRIANGLE_FAN, 0, vertices.length / 2);
  }

  requestAnimationFrame(() => draw(ctx));
}

const createProgram = (ctx: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string) => {
  const vertexShader = ctx.createShader(ctx.VERTEX_SHADER);
  if (!vertexShader) throw new Error("Failed to create vertex shader");
  ctx.shaderSource(vertexShader, vertexShaderSource);
  ctx.compileShader(vertexShader);
  const vLog = ctx.getShaderInfoLog(vertexShader);
  if (vLog && vLog.length > 0) console.error(vLog);

  const fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER);
  if (!fragmentShader) throw new Error("Failed to create fragment shader");
  ctx.shaderSource(fragmentShader, fragmentShaderSource);
  ctx.compileShader(fragmentShader);
  const fLog = ctx.getShaderInfoLog(fragmentShader);
  if (fLog && fLog.length > 0) console.error(fLog);

  const program = ctx.createProgram();
  if (!program) throw new Error("Failed to create program");

  ctx.attachShader(program, vertexShader);
  ctx.attachShader(program, fragmentShader);
  ctx.linkProgram(program);

  const pLog = ctx.getProgramInfoLog(program);
  if (pLog && pLog.length > 0) console.error(pLog);

  return program;
}

const createDataTexture = (ctx: WebGL2RenderingContext) => {
  const texture = ctx.createTexture();
  ctx.bindTexture(ctx.TEXTURE_2D, texture);
  // Use R8 for normalized float access in shader (0.0 - 1.0)
  ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.R16F, audioTextureSizeX, audioTextureSizeY, 0, ctx.RED, ctx.FLOAT, null);
  
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.MIRRORED_REPEAT);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.MIRRORED_REPEAT);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
  
  ctx.bindTexture(ctx.TEXTURE_2D, null);
  return texture;
}

const createFramebuffer = (ctx: WebGL2RenderingContext, texture: WebGLTexture | null) => {
    const fbo = ctx.createFramebuffer();
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fbo);
    ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, texture, 0);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
    return fbo;
}

const vertices = [
  -1, -1,
  1, -1,
  1, 1,
  -1, 1,
];

const vertexShaderSource = /* glsl */`
attribute vec4 aVertexPosition;
varying vec2 vUv;

void main() {
  gl_Position = aVertexPosition;
  // Convert -1..1 to 0..1 for texture coords
  vUv = aVertexPosition.xy * 0.5 + 0.5;
}
`;

// Simple pass-through + shift
const shiftFragmentShaderSource = /* glsl */`
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
    // We want to shift data 'down' (or up in Y). 
    // If we write to Y, we want the value from Y-1 (or Y+1).
    // Let's say Y=0 is the newest data.
    // At Y=1, we want the data that was at Y=0.
    // So we sample at Y - 1/height.
    
    vec2 st = vUv;
    float pixelH = 1.0 / u_resolution.y;
    
    // Sample from the 'previous' row (closer to 0)
    // If we are at row 5, we want what was at row 4.
    vec2 samplePos = vec2(st.x, st.y - pixelH);
    
    gl_FragColor = texture2D(u_texture, samplePos);
}
`;

const fragmentShaderSource = /* glsl */`
precision highp float;

uniform sampler2D u_audio;
uniform vec2 u_resolution;
varying vec2 vUv;
uniform float u_time;

vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    mat4 r = mat4(
        vec4(c, 0, s, 0),
        vec4(0, 1, 0, 0),
        vec4(-s, 0, c, 0),
        vec4(0, 0, 0, 1)
    );
    return (vec4(p, 1.0) * r).xyz;
}

vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    // correct aspect ratio
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    // centering
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}

float getScene(in vec3 pos) {
  pos.y -= 0.5;
    float x = (pos.x + 0.5) * 0.2 + sin(pos.y * 2.0) * 0.1;
    float y = (pos.y + 0.0) * 0.05 + sin(pos.x * 3.0) * 0.1;
    float a = 1.0 ;/// (abs(y) + 1.0);
    float audioVal = texture2D(u_audio, vec2(x+0.0, y+0.00)).r;
                   // + texture2D(u_audio, vec2(x+0.005, y+0.01)).r 
                   // + texture2D(u_audio, vec2(x+0.001, y+0.02)).r;
    return length(pos) - 1.0 - audioVal * 0.1 * a - sin(pos.y * 7.0 + u_time * 1.0) * 0.03;
}

vec3 getNormal(in vec3 pos) {
    vec3 eps = vec3(.0002,0.0,0.0);
    return normalize(vec3(
    getScene(pos+eps.xyy) - getScene(pos-eps.xyy),
    getScene(pos+eps.yxy) - getScene(pos-eps.yxy),
    getScene(pos+eps.yyx) - getScene(pos-eps.yyx) ));
}

void main() {
  vec2 st = coord(gl_FragCoord.xy);

  float angle = sin(u_time * 0.1) * 0.5;
  vec3 ray = rotateY(normalize(vec3(st, 0.5)), angle);
  vec3 pos = rotateY(vec3(0.0, 0.0, -3.0), angle);
  vec3 color = vec3(0.0);
  vec3 normal = vec3(0.1, 0.0, 0.0);
  float t = 0.0;
  for (int i = 0; i < 200; i++) {
    float dist = getScene(pos + ray * t);

    if (dist < 0.0001) {
      color = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), 1.0 / (t * t));
      normal = getNormal(pos + ray * t);
      break;
    }
    if (dist > 10.0) {
      break;
    }

    t += dist;
  }

  // Lighting
  vec3 reflection = reflect(ray, normal);
  
  vec3 lightDir1 = normalize(vec3(1.0, 1.0, -1.0));
  float light1 = max(dot(normal, lightDir1), 0.0);
  color += light1 * vec3(1.2, 0.6, 0.3) * 0.9;

  vec3 lightDir2 = normalize(vec3(-1.0, -1.0, 1.0));
  float light2 = max(dot(normal, lightDir2), 0.0);
  color += light2 * vec3(0.3, 1.1, 0.7) * 0.9;

  float reflectionLight = max(pow(dot(reflection, lightDir1), 8.0), 0.0);
  color += reflectionLight * 0.5 * vec3(0.4, 0.7, 1.2);

  color = pow(color * 0.5, vec3(1.4));

  // color = mix(color, vec3(1.0), t * 0.2);
  
  gl_FragColor = vec4(color, 1.0);
}
`;