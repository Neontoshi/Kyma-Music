import React, { useRef, useCallback, useState } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";

const IconMuted = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="3" x2="21" y2="21" />
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
  </svg>
);
const IconLow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);
const IconHigh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const VolumeControl: React.FC = () => {
  const { volume, setVolume, toggleMute } = usePlayer();

  const [, forceUpdate] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragValue = useRef<number | null>(null);

  const displayVolume =
    isDragging.current && dragValue.current !== null
      ? dragValue.current
      : volume;

  const getValueFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      if (!trackRef.current) return -1;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      return Math.round(Math.min(100, Math.max(0, ratio * 100)));
    },
    [],
  );

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = true;
      const val = getValueFromEvent(e);
      if (val >= 0) {
        dragValue.current = val;
        setVolume(val);
        forceUpdate((n) => n + 1);
      }

      const onMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const val = getValueFromEvent(e);
        if (val >= 0) {
          dragValue.current = val;
          setVolume(val);
          forceUpdate((n) => n + 1);
        }
      };

      const onUp = () => {
        isDragging.current = false;
        dragValue.current = null;
        forceUpdate((n) => n + 1);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [getValueFromEvent, setVolume],
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setVolume(Math.min(100, Math.max(0, volume + (e.deltaY < 0 ? 5 : -5))));
  };

  const getIcon = () => {
    if (volume === 0) return <IconMuted />;
    if (volume < 40) return <IconLow />;
    return <IconHigh />;
  };

  return (
    <div className="vol-wrap" onWheel={handleWheel}>
      <button
        className="vol-icon"
        onClick={toggleMute}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleMute();
        }}
        title={`Volume: ${displayVolume}%`}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        {getIcon()}
      </button>

      <div
        ref={trackRef}
        className="vol-track"
        onMouseDown={handleTrackMouseDown}
        title={`${displayVolume}%`}
      >
        <div className="vol-fill" style={{ width: `${displayVolume}%` }} />
      </div>
    </div>
  );
};

export default VolumeControl;
