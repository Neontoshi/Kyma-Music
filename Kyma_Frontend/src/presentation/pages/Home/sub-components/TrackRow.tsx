// Kyma_Frontend/src/presentation/pages/Home/sub-components/TrackRow.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import PlayingBars from "../../../components/PlayingBars";
import SongArt from "./SongArt";

interface TrackRowProps {
  index?: number | string;
  song: Song | any;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  showPlays?: boolean;
  showTime?: boolean;
}

const TrackRow: React.FC<TrackRowProps> = ({
  index,
  song,
  isActive,
  isPlaying,
  onClick,
  showPlays,
  showTime,
}) => (
  <div
    onClick={onClick}
    style={{
      display: "grid",
      gridTemplateColumns:
        index !== undefined ? "28px 36px 1fr auto" : "36px 1fr auto",
      alignItems: "center",
      gap: "10px",
      padding: "8px 10px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: "background 0.12s",
      background: isActive ? "rgba(var(--accent-rgb),0.08)" : "transparent",
      border: "1px solid",
      borderColor: isActive ? "rgba(var(--accent-rgb),0.2)" : "transparent",
    }}
    onMouseEnter={(e) => {
      if (!isActive) e.currentTarget.style.background = "var(--surface2)";
    }}
    onMouseLeave={(e) => {
      if (!isActive) e.currentTarget.style.background = "transparent";
    }}
  >
    {index !== undefined && (
      <div
        style={{
          fontFamily: "var(--font-family-mono, 'Inter', sans-serif)",
          fontSize: "10px",
          color: isActive ? "var(--accent)" : "var(--text3)",
          textAlign: "center",
        }}
      >
        {isActive && isPlaying ? <PlayingBars height={12} color="var(--accent2)" /> : index}
      </div>
    )}
    <SongArt
      song={song}
      artwork={song.thumbnail}
      videoId={song.video_id || song.videoId}
      size={36}
      radius={6}
    />
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: isActive ? "var(--accent2)" : "var(--text)",
        }}
      >
        {song.title}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text3)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: "1px",
        }}
      >
        {song.artist}
      </div>
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "2px",
        flexShrink: 0,
      }}
    >
      {showTime && (
        <span
          style={{
            fontFamily: "var(--font-family-mono, 'Inter', sans-serif)",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          {song.dur}
        </span>
      )}
      {showPlays && (song.plays ?? 0) > 0 && (
        <span
          style={{
            fontFamily: "var(--font-family-mono, 'Inter', sans-serif)",
            fontSize: "9px",
            color: "var(--accent)",
            background: "rgba(var(--accent-rgb),0.1)",
            padding: "1px 5px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {song.plays}×
        </span>
      )}
    </div>
  </div>
);

export default TrackRow;
