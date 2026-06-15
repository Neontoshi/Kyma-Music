// Kyma_Frontend/src/presentation/pages/Home/sub-components/MediaCard.tsx
import React from "react";
import PlayingBars from "./PlayingBars";

interface MediaCardProps {
  title: string;
  sub: string;
  art?: string;
  emoji?: string;
  grad?: string;
  videoId?: string;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  width?: number;
  badge?: string;
}

const MediaCard: React.FC<MediaCardProps> = ({
  title,
  sub,
  art,
  emoji,
  grad,
  videoId,
  isActive,
  isPlaying,
  onClick,
  width = 140,
  badge,
}) => (
  <div
    onClick={onClick}
    style={{ flexShrink: 0, width, cursor: "pointer", position: "relative" }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
  >
    <div
      style={{
        width: "100%",
        aspectRatio: "1",
        borderRadius: "var(--radius-md)",
        background: grad || "var(--surface2)",
        overflow: "hidden",
        position: "relative",
        border: isActive
          ? "2px solid var(--accent)"
          : "1px solid var(--border)",
        transition: "border-color 0.2s, transform 0.2s",
        boxShadow: isActive ? "0 0 20px rgba(124,106,245,0.3)" : "none",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : videoId ? (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          {emoji || "🎵"}
        </div>
      )}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            borderRadius: "var(--radius-xs)",
            padding: "2px 6px",
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "9px",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          {badge}
        </div>
      )}
      <div
        className="card-overlay"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-circle)",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isActive ? 1 : 0,
            transform: isActive ? "scale(1)" : "scale(0.7)",
            transition: "all 0.2s",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          className="card-play-btn"
        >
          {isActive && isPlaying ? (
            <PlayingBars />
          ) : (
            <svg viewBox="0 0 24 24" fill="#fff" width="12" height="12">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </div>
      </div>
    </div>
    <div
      style={{
        fontSize: "12px",
        fontWeight: 700,
        marginTop: "7px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: isActive ? "var(--accent)" : "var(--text)",
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontSize: "10px",
        color: "var(--text3)",
        fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
        marginTop: "2px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {sub}
    </div>
  </div>
);

export default MediaCard;
