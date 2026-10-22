import React, { useEffect, useRef, useState } from "react";
import SectionHeader from "../sub-components/SectionHeader";
import PlayingBars from "../../../components/PlayingBars";

interface TrendingCarouselProps {
  trendingChart: any[];
  currentSong: any;
  isPlaying: boolean;
  onPlayTrending: (track: any, allTracks: any[]) => void;
}

const CARD_COUNT = 10;

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  trendingChart,
  currentSong,
  isPlaying,
  onPlayTrending,
}) => {
  const tracks = trendingChart.slice(0, CARD_COUNT);
  const [active, setActive] = useState(0);
  const wheelLock = useRef(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (active >= tracks.length) {
      setActive(Math.max(0, tracks.length - 1));
    }
  }, [tracks.length, active]);

  if (tracks.length === 0) return null;

  const step = (direction: number) => {
    setActive((current) =>
      Math.min(Math.max(current + direction, 0), tracks.length - 1),
    );
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - wheelLock.current < 260) return;
    wheelLock.current = now;
    step(event.deltaX > 0 ? 1 : -1);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    dragStart.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > 48) step(delta < 0 ? 1 : -1);
  };

  return (
    <section className="hp-trending hp-section">
      <SectionHeader
        label="Trending Now"
        sub="Deezer chart"
        action={{ label: "Play all", onClick: () => onPlayTrending(tracks[0], tracks) }}
      />

      <div
        className="hp-coverflow"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => (dragStart.current = null)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
      >
        <button
          className="hp-cover-nav hp-cover-prev"
          onClick={() => step(-1)}
          disabled={active === 0}
          aria-label="Previous trending track"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="hp-cover-stage">
          {tracks.map((track, index) => {
            const offset = index - active;
            const absolute = Math.abs(offset);
            const isActive = index === active;
            const activeTrackPlaying =
              currentSong?.id === `yt-${track.videoId}` && isPlaying;

            return (
              <button
                key={track.id || `${track.artist}-${track.title}`}
                className={`hp-cover-card${isActive ? " is-active" : ""}`}
                style={
                  {
                    zIndex: CARD_COUNT - absolute,
                    opacity: absolute > 4 ? 0 : 1 - absolute * 0.09,
                    pointerEvents: absolute > 4 ? "none" : "auto",
                    "--offset": offset,
                    "--abs-offset": absolute,
                    "--card-scale": Math.max(0.62, 1 - absolute * 0.075),
                  } as React.CSSProperties
                }
                onClick={() => {
                  if (isActive) onPlayTrending(track, tracks);
                  else setActive(index);
                }}
                aria-label={`${isActive ? "Play" : "View"} ${track.title} by ${track.artist}`}
                tabIndex={isActive ? 0 : -1}
              >
                <div className="hp-cover-art">
                  {track.artwork_url || track.thumbnail ? (
                    <img
                      src={track.artwork_url || track.thumbnail}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span>🎵</span>
                  )}
                  <span className="hp-cover-rank">
                    #{track.position ?? index + 1}
                  </span>
                  <div className="hp-cover-shade" />
                  <span className="hp-cover-play">
                    {activeTrackPlaying ? (
                      <PlayingBars height={13} color="#050505" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </span>
                </div>
                <span className="hp-cover-title">{track.title}</span>
                <span className="hp-cover-sub">{track.artist}</span>
              </button>
            );
          })}
        </div>

        <button
          className="hp-cover-nav hp-cover-next"
          onClick={() => step(1)}
          disabled={active === tracks.length - 1}
          aria-label="Next trending track"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="hp-cover-meta">
        <span className="hp-cover-position">
          <strong>{String(active + 1).padStart(2, "0")}</strong>
          <i />
          {String(tracks.length).padStart(2, "0")}
        </span>
        <span className="hp-cover-hint">
          Scroll, drag or click a side card
        </span>
        <div className="hp-cover-dots">
          {tracks.map((track, index) => (
            <button
              key={track.id || `${track.artist}-${track.title}`}
              className={`hp-cover-dot${index === active ? " is-active" : ""}`}
              onClick={() => setActive(index)}
              aria-label={`Go to ${track.title}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingCarousel;
