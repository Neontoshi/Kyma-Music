import React from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit,
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--text3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "13px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--accent2)",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: "6px",
          borderRadius: "var(--radius-pill)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-pill)",
            background: "linear-gradient(90deg, #7c6af5, #c084fc)",
            transition: "width 0.1s",
            boxShadow: "0 0 8px rgba(124,106,245,0.4)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            position: "absolute",
            inset: "-6px 0",
            width: "100%",
            height: "18px",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: "16px",
            height: "16px",
            borderRadius: "var(--radius-circle)",
            background: "#fff",
            boxShadow:
              "0 0 0 3px rgba(124,106,245,0.5), 0 2px 8px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            transition: "left 0.1s",
          }}
        />
      </div>
    </div>
  );
};

export default Slider;
