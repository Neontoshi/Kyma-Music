// Kyma_Frontend/src/presentation/pages/Home/components/SimilarArtists.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";

interface SimilarArtistsProps {
  similarArtists: any[];
  topLocalArtist: string;
  onArtistClick: (artistName: string) => void;
}

const SimilarArtists: React.FC<SimilarArtistsProps> = ({
  similarArtists,
  topLocalArtist,
  onArtistClick,
}) => {
  if (similarArtists.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: 0, animationDelay: "0.1s" }}
    >
      <SectionHeader
        label="🔗 Fans also like"
        sub={`similar to ${topLocalArtist}`}
      />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {similarArtists.map((a: any) => (
          <div
            key={a.name}
            onClick={() => onArtistClick(a.name)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px 8px 8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              transition: "border-color 0.15s, transform 0.15s",
              fontSize: "12px",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-circle)",
                background: "var(--surface2)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                "🎤"
              )}
            </div>
            <span>{a.name}</span>
            <span
              style={{
                fontFamily: "var(--font-family-mono, 'Inter', sans-serif)",
                fontSize: "9px",
                color: "var(--text3)",
              }}
            >
              {a.match_score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimilarArtists;
