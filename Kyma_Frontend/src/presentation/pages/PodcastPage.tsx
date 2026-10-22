import React, { useState, useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { formatTotalDuration as formatDuration } from "../../lib/formatTime";
import { randomGradient } from "../../lib/gradients";
import { makeSong } from "../../lib/song";

const CATEGORIES = [
  { label: "Comedy", query: "comedy podcast full episode 2025" },
  { label: "True Crime", query: "true crime podcast full episode" },
  { label: "Tech", query: "tech podcast full episode 2025" },
  { label: "Stoicism", query: "stoicism philosophy podcast full episode" },
  { label: "Self Help", query: "self improvement podcast full episode" },
  { label: "Relationships", query: "relationship advice podcast full episode" },
  { label: "Conspiracy", query: "conspiracy theory podcast full episode" },
  { label: "Scary Stories", query: "scary stories podcast full episode" },
  {
    label: "Space & Sci-Fi",
    query: "space universe aliens podcast full episode",
  },
  { label: "Money", query: "money finance podcast full episode 2025" },
  { label: "Gaming", query: "gaming podcast full episode" },
  { label: "Anime", query: "anime podcast full episode" },
];

const PodcastPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const setError = usePlayerStore((s) => s.setError);
  const { ytdlpAvailable, ytdlpChecked } = useSystemStore();
  const [episodes, setEpisodes] = useState<Song[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!ytdlpAvailable) {
      if (ytdlpChecked) setLoading(false);
      return;
    }

    const query = searchQuery.trim()
      ? `${searchQuery} podcast full episode`
      : CATEGORIES[activeCategory].query;

    setLoading(true);
    setEpisodes([]);

    const timer = setTimeout(() => {
      tauriCommands
        .searchYoutube(query)
        .then((yt: any[]) => {
          const filtered = (yt || [])
            .filter((r: any) => {
              const dur = r.duration_secs;
              return dur && dur > 600;
            })
            .map((r: any) =>
              makeSong({
                id: `yt-${r.id}`,
                title: r.title,
                artist: r.artist,
                album: "Podcast",
                duration: r.duration_secs,
                artwork: r.thumbnail,
                source: "youtube",
                videoId: r.id,
                dur: formatDuration(r.duration_secs),
                emoji: "🎙️",
              }),
            );
          setEpisodes(filtered);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load podcasts:", err);
          setError(
            "Couldn't load podcasts. Check your internet connection and try again.",
          );
          setLoading(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery, ytdlpAvailable, ytdlpChecked, setError]);

  const handlePlay = (song: Song, _index: number) => {
    setQueue(episodes, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const currentSongId = currentSong?.id;
  const category = CATEGORIES[activeCategory];
  const heroArt = episodes.find((episode) => episode.artwork)?.artwork;
  const heading = searchQuery.trim()
    ? `Results for “${searchQuery.trim()}”`
    : `${category.label} episodes`;

  return (
    <div className="podcast-page">
      <div className="podcast-header-wrap">
        <div className="podcast-header-inner">
          {ytdlpChecked && !ytdlpAvailable && (
            <div className="podcast-warning">
              <span>⚠️</span> yt-dlp not installed. Podcasts are unavailable.
              Run: <code>pip install yt-dlp</code>
            </div>
          )}

          <header className="artist-collection-header podcast-collection-header">
            <div className="artist-collection-copy">
              <div className="artist-collection-eyebrow">
                <span className="artist-collection-dot" />
                Listen
              </div>
              <h1 className="artist-collection-title">Podcasts</h1>
              <p className="artist-collection-subtitle">
                {searchQuery.trim()
                  ? `Search results for “${searchQuery.trim()}”`
                  : `${category.label} · ${episodes.length} episodes`}
              </p>
            </div>
            <div className="artist-collection-controls">
              <div className="ap-search-wrap podcast-search">
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={
                    ytdlpAvailable ? "Search podcasts…" : "yt-dlp required…"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!ytdlpAvailable}
                />
              </div>
            </div>
          </header>

          <div className="podcast-categories">
            {CATEGORIES.map((item, i) => (
              <button
                key={item.label}
                type="button"
                className={`podcast-chip${activeCategory === i && !searchQuery.trim() ? " active" : ""}`}
                onClick={() => {
                  if (!ytdlpAvailable) return;
                  setActiveCategory(i);
                  setSearchQuery("");
                }}
                disabled={!ytdlpAvailable}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="podcast-scroll">
        <div className="podcast-inner">
          {!ytdlpAvailable && ytdlpChecked ? (
            <div className="podcast-empty">
              <div className="podcast-empty-icon">🎙️</div>
              <h2>Podcasts need yt-dlp</h2>
              <p>Install yt-dlp to browse and listen to podcast episodes.</p>
            </div>
          ) : loading ? (
            <div className="podcast-loading">
              <div className="ap-spinner ap-spinner--sm" />
              <span>Loading episodes…</span>
            </div>
          ) : episodes.length === 0 ? (
            <div className="podcast-empty">
              <div className="podcast-empty-icon">🎧</div>
              <h2>No episodes found</h2>
              <p>Try another category or search for a different show.</p>
            </div>
          ) : (
            <>
              {!searchQuery.trim() && (
                <section className="podcast-hero">
                  <div className="podcast-hero-art">
                    {heroArt ? (
                      <img src={heroArt} alt="" />
                    ) : (
                      <span>🎙️</span>
                    )}
                  </div>
                  <div className="podcast-hero-copy">
                    <div className="podcast-hero-eyebrow">
                      Featured category
                    </div>
                    <h2>{category.label}</h2>
                    <p>
                      {episodes.length} episodes · Conversations worth your time
                    </p>
                    <button
                      type="button"
                      className="podcast-hero-play"
                      onClick={() => handlePlay(episodes[0], 0)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="13"
                        height="13"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                      Play latest
                    </button>
                  </div>
                </section>
              )}

              <section className="artist-all-songs podcast-tracks-panel">
                <div className="artist-section-head">
                  <h2>{heading}</h2>
                  <span>{episodes.length}</span>
                </div>
                <div className="podcast-episode-list">
                  {episodes.map((episode, i) => {
                    const isActive = currentSongId === episode.id;
                    return (
                      <div
                        key={episode.id}
                        className={`podcast-episode-row${isActive ? " active" : ""}`}
                        onClick={() => handlePlay(episode, i)}
                      >
                        <div className="podcast-episode-num">
                          {isActive && isPlaying ? (
                            <span className="podcast-playing-bars">
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : (
                            i + 1
                          )}
                        </div>
                        <div
                          className="podcast-episode-thumb"
                          style={{
                            background:
                              episode.grad ||
                              randomGradient(episode.title),
                          }}
                        >
                          {episode.artwork ? (
                            <img src={episode.artwork} alt="" />
                          ) : episode.videoId ? (
                            <img
                              src={`https://i.ytimg.com/vi/${episode.videoId}/default.jpg`}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            "🎙️"
                          )}
                        </div>
                        <div className="podcast-episode-info">
                          <div className="podcast-episode-title">
                            {episode.title}
                          </div>
                          <div className="podcast-episode-artist">
                            {episode.artist}
                          </div>
                        </div>
                        <div className="podcast-episode-dur">
                          {episode.dur}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastPage;
