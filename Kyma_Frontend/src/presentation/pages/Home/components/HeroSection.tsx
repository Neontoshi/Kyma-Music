// Kyma_Frontend/src/presentation/pages/Home/components/HeroSection.tsx
import React from "react";

interface HeroSectionProps {
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
  greeting,
  stats,
  weeklyStats,
  allTimeStats,
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
            "linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.05))",
          border: "1px solid rgba(74,222,128,0.25)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(74,222,128,0.25)")
        }
      >
        <span style={{ fontSize: "16px" }}>✨</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#4ade80",
              fontFamily: "var(--font-family-base)",
            }}
          >
            Update Available
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(74,222,128,0.7)",
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
          stroke="#4ade80"
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
            "linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.05))",
          border: "1px solid rgba(251,191,36,0.25)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)")
        }
      >
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#fbbf24",
              fontFamily: "var(--font-family-base)",
            }}
          >
            yt-dlp is outdated
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(251,191,36,0.7)",
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
          stroke="#fbbf24"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    )}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "9px",
            letterSpacing: "0.22em",
            color: "var(--accent)",
            textTransform: "uppercase",
            marginBottom: "0.4rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "18px",
              height: "1px",
              background: "var(--accent)",
            }}
          />
          {greeting.text}
        </div>
        <h1
          style={{
            fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            fontFamily: "var(--font-family-base, 'Syne', sans-serif)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.4em",
            flexWrap: "wrap",
          }}
        >
          What are
          <span
            style={{
              background:
                "linear-gradient(90deg, var(--accent), var(--accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
              padding: "0.25em 0.15em 0.3em 0",
            }}
          >
            we playing?
          </span>
        </h1>
        <div
          style={{
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "10px",
            color: "var(--text3)",
            marginTop: "0.4rem",
            letterSpacing: "0.04em",
          }}
        >
          {weeklyStats
            ? `${weeklyStats.total_listens} plays`
            : `${stats.total} songs · ${stats.liked} liked`}
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        {[
          { val: stats.total, lbl: "Songs", color: "var(--accent)" },
          {
            val: allTimeStats
              ? `${Math.floor(allTimeStats.total_hours)}h`
              : `${stats.hours}h`,
            lbl: "Listened",
            color: "var(--accent2)",
          },
          { val: stats.liked, lbl: "Liked", color: "#f472b6" },
        ].map(({ val, lbl, color }) => (
          <div
            key={lbl}
            style={{
              padding: "8px 12px",
              textAlign: "center",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              minWidth: "60px",
            }}
          >
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 900,
                color,
                lineHeight: 1,
                fontFamily: "var(--font-family-base, 'Syne', sans-serif)",
              }}
            >
              {val}
            </div>
            <div
              style={{
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                fontSize: "8px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text3)",
                marginTop: "3px",
              }}
            >
              {lbl}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HeroSection;
