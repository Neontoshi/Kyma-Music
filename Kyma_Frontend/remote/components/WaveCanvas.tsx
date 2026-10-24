import React, { useRef, useEffect } from "react";

interface WaveCanvasProps {
  accentRgb: string;
  accent2Rgb: string;
}

const WaveCanvas: React.FC<WaveCanvasProps> = ({ accentRgb, accent2Rgb }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const waves = [
      {
        y: 0.72,
        amp: 34,
        freq: 0.011,
        speed: 0.01,
        phase: 0.0,
        color: `rgba(${accentRgb},0.12)`,
      },
      {
        y: 0.79,
        amp: 26,
        freq: 0.015,
        speed: 0.016,
        phase: 1.5,
        color: `rgba(${accentRgb},0.09)`,
      },
      {
        y: 0.86,
        amp: 18,
        freq: 0.019,
        speed: 0.012,
        phase: 3.0,
        color: `rgba(${accent2Rgb},0.07)`,
      },
      {
        y: 0.92,
        amp: 12,
        freq: 0.024,
        speed: 0.019,
        phase: 0.8,
        color: `rgba(${accentRgb},0.05)`,
      },
      {
        y: 0.97,
        amp: 8,
        freq: 0.03,
        speed: 0.014,
        phase: 2.2,
        color: `rgba(${accent2Rgb},0.035)`,
      },
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawWave = (wave: (typeof waves)[0], t: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const baseY = wave.y * H;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        const y =
          baseY +
          Math.sin(x * wave.freq + wave.phase + t * wave.speed * 60) *
            wave.amp +
          Math.sin(x * wave.freq * 0.5 + t * wave.speed * 40) *
            (wave.amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = wave.color;
      ctx.fill();
    };

    let animId: number;
    const animate = (ts: number) => {
      const t = ts / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      waves.forEach((w) => drawWave(w, t));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [accentRgb, accent2Rgb]);

  return <canvas ref={canvasRef} className="wave-canvas" />;
};

export default WaveCanvas;
