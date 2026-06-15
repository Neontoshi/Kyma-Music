import React from "react";

interface Props {
  volume: number;
  onVolumeChange: (v: number) => void;
}

const VolumeSlider: React.FC<Props> = ({ volume, onVolumeChange }) => (
  <div className="vol-wrap">
    <span className="vol-icon">🔉</span>
    <input
      type="range"
      min="0"
      max="100"
      value={volume}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
    />
    <span className="vol-icon">🔊</span>
  </div>
);

export default VolumeSlider;
