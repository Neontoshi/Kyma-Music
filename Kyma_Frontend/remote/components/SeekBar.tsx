import React from "react";

interface Props {
  position: number;
  duration: number;
  onSeek: (pct: number) => void;
}

const formatTime = (s: number) => {
  const safe = Number.isFinite(s) ? Math.max(0, s) : 0;
  const m = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const SeekBar: React.FC<Props> = ({ position, duration, onSeek }) => {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <>
      <div className="time-row">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="seek-wrap">
        <input
          type="range"
          className="cast-range"
          min="0"
          max="100"
          step="0.1"
          value={pct}
          aria-label="Seek"
          style={{ "--range-progress": `${pct}%` } as React.CSSProperties}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>
    </>
  );
};

export default SeekBar;
