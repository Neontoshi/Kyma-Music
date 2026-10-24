import React from "react";

interface Props {
  volume: number;
  onVolumeChange: (v: number) => void;
}

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    {muted ? (
      <>
        <line x1="16" y1="9" x2="22" y2="15" />
        <line x1="22" y1="9" x2="16" y2="15" />
      </>
    ) : (
      <>
        <path d="M16 9a5 5 0 0 1 0 6" />
        <path d="M19 6a9 9 0 0 1 0 12" />
      </>
    )}
  </svg>
);

const VolumeSlider: React.FC<Props> = ({ volume, onVolumeChange }) => (
  <div className="vol-wrap">
    <span className="vol-icon">
      <SpeakerIcon muted={volume === 0} />
    </span>
    <input
      type="range"
      className="cast-range"
      min="0"
      max="100"
      value={volume}
      aria-label="Volume"
      style={{ "--range-progress": `${volume}%` } as React.CSSProperties}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
    />
    <span className="vol-value">{volume}%</span>
  </div>
);

export default VolumeSlider;
