import React, { useRef, useCallback, useState, useEffect } from "react";
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

  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragValue = useRef<number | null>(null);

  // Same derived pattern as ProgressSlider
  const displayVolume =
    isDragging.current && dragValue.current !== null
      ? dragValue.current
      : volume;

  const getValueFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      if (!trackRef.current) return -1;
      const rect = trackRef.current.getBoundingClientRect();
      // Top = 100, bottom = 0
      const ratio = 1 - (e.clientY - rect.top) / rect.height;
      return Math.round(Math.min(100, Math.max(0, ratio * 100)));
    },
    [],
  );

  // In VolumeControl.tsx, replace the handleTrackMouseDown function:

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = true;
      const val = getValueFromEvent(e);
      if (val >= 0) {
        dragValue.current = val;
        setVolume(val); // This already updates store immediately
        forceUpdate((n) => n + 1);
      }

      const onMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const val = getValueFromEvent(e);
        if (val >= 0) {
          dragValue.current = val;
          setVolume(val); // Immediate update on each move
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
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Scroll wheel nudge
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
    <div ref={wrapperRef} className="vol-wrap" onWheel={handleWheel}>
      {/* Speaker icon */}
      <div
        className="vol-icon"
        onClick={() => setOpen((o) => !o)}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleMute();
        }}
        title={`Volume: ${displayVolume}% — right-click to mute`}
      >
        {getIcon()}
      </div>

      {/* Popover */}
      {open && (
        <div className="vol-popover">
          {/* % label */}
          <span className="vol-popover-label">{displayVolume}</span>

          {/* Vertical track */}
          <div
            ref={trackRef}
            className="vol-track-v"
            onMouseDown={handleTrackMouseDown}
          >
            {/* Fill — grows upward from bottom */}
            <div className="vol-fill-v" style={{ height: `${displayVolume}%` }}>
              <div className="vol-thumb-v" />
            </div>
          </div>

          {/* Mute label */}
          <button className="vol-mute-label" onClick={toggleMute}>
            {volume === 0 ? "UNMUTE" : "MUTE"}
          </button>
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
