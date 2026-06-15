// Kyma_Frontend/src/presentation/pages/Home/components/TopArtists.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";

interface TopArtistsProps {
  topArtists: { name: string; plays: number }[];
  onArtistClick: (artistName: string) => void;
}

const TopArtists: React.FC<TopArtistsProps> = ({
  topArtists,
  onArtistClick,
}) => {
  if (topArtists.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.45s" }}
    >
      <SectionHeader label="Top Artists" sub="this week" />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {topArtists.map((a, i) => (
          <div
            key={i}
            onClick={() => onArtistClick(a.name)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px 7px 8px",
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
                width: 26,
                height: 26,
                borderRadius: "var(--radius-circle)",
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              🎤
            </div>
            <span>{a.name}</span>
            <span
              style={{
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                fontSize: "9px",
                color: "var(--text3)",
              }}
            >
              {a.plays}×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopArtists;
