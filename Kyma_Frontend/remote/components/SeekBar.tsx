import React from "react";

interface Props {
  position: number;
  duration: number;
  onSeek: (pct: number) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const SeekBar: React.FC<Props> = ({ position, duration, onSeek }) => {
  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <>
      <div className="time-row">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="seek-wrap">
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>
    </>
  );
};

export default SeekBar;
