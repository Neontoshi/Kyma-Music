import React from "react";

interface Props {
  isPlaying: boolean;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
}

const Controls: React.FC<Props> = ({ isPlaying, onPrev, onToggle, onNext }) => (
  <div className="controls">
    <button className="btn btn-small" onClick={onPrev}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="19,20 9,12 19,4" />
        <line x1="5" y1="19" x2="5" y2="5" />
      </svg>
    </button>
    <button className="btn btn-play" onClick={onToggle}>
      {isPlaying ? (
        <svg viewBox="0 0 24 24" fill="white">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="white">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </button>
    <button className="btn btn-small" onClick={onNext}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="5,4 15,12 5,20" />
        <line x1="19" y1="5" x2="19" y2="19" />
      </svg>
    </button>
  </div>
);

export default Controls;
