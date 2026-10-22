// Kyma_Frontend/src/presentation/pages/Home/components/HeroSection.tsx
import React from "react";

interface HeroSectionProps {
  displayName?: string;
  greeting: { text: string; period: string };
  stats: { total: number; hours: number; liked: number };
  weeklyStats: any;
  allTimeStats: any;
  updateAvailable?: boolean;
  updateVersion?: string;
  onUpdateClick?: () => void;
  ytdlpOutdated?: boolean;
  ytdlpVersion?: string | null;
  onUpdateYtdlp?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  displayName,
  greeting,
  stats,
  weeklyStats,
  updateAvailable,
  updateVersion,
  onUpdateClick,
  ytdlpOutdated,
  ytdlpVersion,
  onUpdateYtdlp,
}) => (
  <div
    style={{
      padding: "1.2rem 1rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
      borderBottom: "1px solid var(--border)",
      marginBottom: "1.5rem",
      animation: "fadeUp 0.5s ease both",
    }}
  >
    {/* Update Banner */}
    {updateAvailable && (
      <div
        onClick={onUpdateClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 16px",
          background:
            "linear-gradient(135deg, rgba(var(--accent3-rgb),0.1), rgba(var(--accent3-rgb),0.05))",
          border: "1px solid rgba(var(--accent3-rgb),0.25)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(var(--accent3-rgb),0.5)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(var(--accent3-rgb),0.25)")
        }
      >
        <span style={{ fontSize: "16px" }}>✨</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--accent3)",
              fontFamily: "var(--font-family-base)",
            }}
          >
            Update Available
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(var(--accent3-rgb),0.7)",
              fontFamily: "var(--font-family-mono)",
              marginTop: "2px",
            }}
          >
            Version {updateVersion} is ready — click to install
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent3)"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    )}

    {/* yt-dlp Outdated Banner */}
    {ytdlpOutdated && (
      <div
        onClick={onUpdateYtdlp}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 16px",
          background:
            "linear-gradient(135deg, rgba(255,77,77,0.1), rgba(255,77,77,0.05))",
          border: "1px solid rgba(255,77,77,0.25)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,77,77,0.5)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,77,77,0.25)")
        }
      >
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#ff4d4d",
              fontFamily: "var(--font-family-base)",
            }}
          >
            yt-dlp is outdated
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255,77,77,0.7)",
              fontFamily: "var(--font-family-mono)",
              marginTop: "2px",
            }}
          >
            Version {ytdlpVersion} — click to update for better streaming
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff4d4d"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    )}

    <div className="home-hero">
      <h1 className="home-hero-title">
        {greeting.text}
        {displayName ? `, ${displayName}` : ""}
      </h1>
      <p className="home-hero-sub">
        {weeklyStats
          ? `${weeklyStats.total_listens} plays this week`
          : `${stats.total} songs in your library · ${stats.liked} liked`}
      </p>
    </div>
  </div>
);

export default HeroSection;
