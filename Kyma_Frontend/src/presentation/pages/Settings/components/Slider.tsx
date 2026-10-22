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
    <div className="settings-slider">
      <div className="settings-slider-head">
        <span className="settings-slider-label">{label}</span>
        <span className="settings-slider-value">
          {value}
          {unit}
        </span>
      </div>
      <div
        className="settings-slider-track"
        style={{ "--slider-pct": `${pct}%` } as React.CSSProperties}
      >
        <span className="settings-slider-fill" />
        <span className="settings-slider-thumb" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
};

export default Slider;
