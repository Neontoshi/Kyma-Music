// Kyma_Frontend/src/presentation/pages/Home/sub-components/SongArt.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";

interface SongArtProps {
  song?: Song;
  artwork?: string;
  emoji?: string;
  grad?: string;
  videoId?: string;
  size?: number;
  radius?: number;
}

const SongArt: React.FC<SongArtProps> = ({
  song,
  artwork,
  emoji,
  grad,
  videoId,
  size = 48,
  radius = 8,
}) => {
  const art = artwork || song?.artwork;
  const em = emoji || song?.emoji || "🎵";
  const gr =
    grad ||
    song?.grad ||
    "linear-gradient(135deg, var(--accent), var(--accent2))";
  const vid = videoId || song?.videoId;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: gr,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
        />
      ) : vid ? (
        <img
          src={`https://i.ytimg.com/vi/${vid}/default.jpg`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <span>{em}</span>
      )}
    </div>
  );
};

export default SongArt;
