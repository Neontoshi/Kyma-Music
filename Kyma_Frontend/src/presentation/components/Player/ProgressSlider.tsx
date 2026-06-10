import React, { useRef, useCallback, useState } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { formatTime } from "../../../lib/formatTime";
import { usePlayerStore } from "../../stores/playerStore";
import { logger } from "../../../services/logger";

const ProgressSlider: React.FC = () => {
  const { setProgress } = usePlayer();
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isRadio = usePlayerStore((s) => {
    const song = s.currentSong;
    if (!song) return false;
    return (
      song.id?.startsWith("radio-") ||
      (song.path?.startsWith("http") && !song.videoId)
    );
  });

  const progressTrackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragPercent = useRef<number | null>(null);
  const dragStartTime = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  // Derived inline — no stale state, no effect timing issues.
  // When song changes, playSong sets duration=0 and progress=0 in the store,
  // so this naturally resolves to 0 on the same render without any bleed.
  const displayPercent =
    isDragging.current && dragPercent.current !== null
      ? dragPercent.current
      : duration > 0
        ? (currentProgress / duration) * 100
        : 0;

  const getPercentFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      if (!progressTrackRef.current || duration <= 0) return -1;
      const rect = progressTrackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      return Math.min(1, Math.max(0, x / rect.width));
    },
    [duration],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return;

      dragStartTime.current = Date.now();
      isDragging.current = true;
      const percent = getPercentFromEvent(e);
      if (percent >= 0) {
        dragPercent.current = percent * 100;
        setProgress(percent * duration);
        forceUpdate((n) => n + 1);
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const percent = getPercentFromEvent(e);
        if (percent >= 0) {
          dragPercent.current = percent * 100;
          setProgress(percent * duration);
          forceUpdate((n) => n + 1);
        }
      };

      const handleMouseUp = () => {
        const dragDuration = Date.now() - dragStartTime.current;
        const finalPercent =
          dragPercent.current !== null
            ? dragPercent.current
            : (currentProgress / duration) * 100;
        const finalPosition = (finalPercent / 100) * duration;

        // Only log if we actually changed position (not just clicking at same spot)
        if (
          dragDuration > 100 ||
          Math.abs(finalPercent - (currentProgress / duration) * 100) > 1
        ) {
          logger.logUI("ProgressSlider", "seek", {
            from: currentProgress.toFixed(1),
            to: finalPosition.toFixed(1),
            songTitle: currentSong?.title?.slice(0, 50),
            songId: currentSong?.id,
            dragDurationMs: dragDuration,
          });
        }

        isDragging.current = false;
        dragPercent.current = null;
        forceUpdate((n) => n + 1);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [getPercentFromEvent, duration, setProgress, currentProgress, currentSong],
  );

  if (isRadio) {
    return (
      <div className="progress-wrap">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--accent)",
              letterSpacing: "0.1em",
              animation: "livePulse 1.5s ease-in-out infinite",
            }}
          >
            ● LIVE
          </span>
        </div>
        <div className="progress-times">
          <span>Live</span>
          <span>∞</span>
        </div>
        <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  const displayTime = duration > 0 ? (displayPercent / 100) * duration : 0;

  return (
    <div className="progress-wrap">
      <div
        className="progress-track"
        ref={progressTrackRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: "pointer" }}
      >
        <div
          className="progress-buffered"
          style={{ width: duration > 0 ? `${buffered * 100}%` : "0%" }}
        />
        <div className="progress-fill" style={{ width: `${displayPercent}%` }}>
          <div className="progress-thumb" />
        </div>
      </div>
      <div className="progress-times">
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressSlider;
