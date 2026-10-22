import React from "react";

interface HeroSectionProps {
  displayName?: string;
  greeting: { text: string; period: string };
  stats: { total: number; hours: number; liked: number };
  weeklyStats: any;
  allTimeStats?: any;
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
  <header className="hp-hero">
    {updateAvailable && (
      <button className="hp-banner hp-banner-update" onClick={onUpdateClick}>
        <span className="hp-banner-icon">✨</span>
        <span className="hp-banner-copy">
          <strong>Update available</strong>
          <small>Version {updateVersion} is ready — click to install</small>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    )}

    {ytdlpOutdated && (
      <button className="hp-banner hp-banner-warn" onClick={onUpdateYtdlp}>
        <span className="hp-banner-icon">⚠</span>
        <span className="hp-banner-copy">
          <strong>yt-dlp is outdated</strong>
          <small>Version {ytdlpVersion} — click to update streaming</small>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    )}

    <div className="hp-hero-main">
      <div className="hp-hero-copy">
        <span className="hp-hero-eyebrow">{greeting.period} listening</span>
        <h1 className="hp-hero-title">
          {greeting.text}
          {displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="hp-hero-sub">
          {weeklyStats
            ? `${weeklyStats.total_listens ?? 0} plays this week · let’s keep the momentum`
            : `${stats.total} songs in your library · ready when you are`}
        </p>
      </div>

      <div className="hp-hero-stats">
        <div className="hp-hero-stat">
          <strong>{stats.total}</strong>
          <span>Songs</span>
        </div>
        <div className="hp-hero-stat">
          <strong>{stats.hours}h</strong>
          <span>Listened</span>
        </div>
        <div className="hp-hero-stat">
          <strong>{stats.liked}</strong>
          <span>Liked</span>
        </div>
      </div>
    </div>
  </header>
);

export default HeroSection;
