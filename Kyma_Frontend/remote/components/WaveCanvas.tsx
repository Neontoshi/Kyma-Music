import React, { useRef, useEffect } from "react";

const waves = [
  {
    y: 0.62,
    amp: 38,
    freq: 0.012,
    speed: 0.012,
    phase: 0.0,
    color: "rgba(124,106,245,0.18)",
  },
  {
    y: 0.7,
    amp: 30,
    freq: 0.015,
    speed: 0.018,
    phase: 1.5,
    color: "rgba(192,132,252,0.13)",
  },
  {
    y: 0.77,
    amp: 22,
    freq: 0.018,
    speed: 0.01,
    phase: 3.0,
    color: "rgba(124,106,245,0.10)",
  },
  {
    y: 0.83,
    amp: 16,
    freq: 0.022,
    speed: 0.022,
    phase: 0.8,
    color: "rgba(192,132,252,0.08)",
  },
  {
    y: 0.9,
    amp: 10,
    freq: 0.028,
    speed: 0.014,
    phase: 2.2,
    color: "rgba(124,106,245,0.06)",
  },
];

const WaveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

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
  }, []);

  return <canvas ref={canvasRef} className="wave-canvas" />;
};

export default WaveCanvas;
