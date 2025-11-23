import { useRef, useMemo, useEffect } from "react";
import { AudioAnalysisState } from "@/lib/audioAnalysis";

export const Background2 = () => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onceRef = useRef<boolean>(false);

  useEffect(() => {
    if (canvasRef.current && !onceRef.current) {
      setupCanvas(canvasRef.current);
      onceRef.current = true;
    }
  }, [canvasRef])

  return (
    <div className="fixed w-[100vw] h-[100vh] -z-10">
      <canvas ref={canvasRef} />
    </div>
  );
}

const setupCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
      return;
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  draw(ctx);
}

const draw = (ctx: CanvasRenderingContext2D) => {
  const t = Date.now() / 1000;

  ctx.resetTransform()
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.strokeStyle = "#ffffff";

  ctx.translate(0, ctx.canvas.height / 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  
  for (let i = 0; i < 400; i++) {
    const x = i / 400;

    // let a = AudioAnalysisState.dataArray ? AudioAnalysisState.dataArray[i] / 255 : 0;
    let a = 0;
    if (AudioAnalysisState.dataArray) {
      for (let j = 5; j < 65; j++) {
        const f = 20 + (j / AudioAnalysisState.dataArray.length) * 24_000;
        const l = f / 20
        const db = AudioAnalysisState.dataArray[j] / 255;
        a += Math.sin(x * Math.PI * 2 * l + j * 10 + 2 * t / j) * db * 0.01;
      }
    }

    const distToCenter = Math.abs(0.5 - x);
    const scale = Math.pow(gaussian(distToCenter), 10);
    const yScaled = a * scale;

    if (i === 0) {
      ctx.moveTo(x * ctx.canvas.width, yScaled * ctx.canvas.height / 2);
    } else {
      ctx.lineTo(x * ctx.canvas.width, yScaled * ctx.canvas.height / 2);
    }
  }

  ctx.stroke();

  requestAnimationFrame(() => draw(ctx));
}

const gaussian = (x: number) => {
  return Math.exp(-x * x);
}