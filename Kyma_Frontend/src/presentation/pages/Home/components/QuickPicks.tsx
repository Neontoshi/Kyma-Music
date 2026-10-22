import React from "react";
import { Song } from "../../../../core/entities/Song";
import PlayingBars from "../../../components/PlayingBars";
import getTimeAgo from "../helpers/timeAgo";
import { makeSong } from "../../../../lib/song";

interface QuickPicksProps {
  quickPicks: Song[];
  recentlyPlayed: any[];
  recentlyPlayedLoading: boolean;
  recentlyPlayedAsSongs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
  onNavigate: (path: string, from: string) => void;
}

const SongArtwork: React.FC<{ song: Song }> = ({ song }) => {
  const art =
    song.artwork ||
    (song.videoId ? `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` : "");

  return (
    <div
      className="hp-pick-art"
      style={{ background: song.grad || "var(--surface3)" }}
    >
      {art ? <img src={art} alt="" loading="lazy" /> : <span>{song.emoji || "♪"}</span>}
    </div>
  );
};

const QuickPicks: React.FC<QuickPicksProps> = ({
  quickPicks,
  recentlyPlayed,
  recentlyPlayedLoading,
  recentlyPlayedAsSongs,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
  onNavigate,
}) => (
  <div className="hp-pick-deck hp-section">
    <section className="hp-pick-panel">
      <div className="hp-panel-head">
        <div>
          <span className="hp-panel-eyebrow">Fresh mix</span>
          <h2>Quick Picks</h2>
        </div>
        <span className="hp-panel-meta">{quickPicks.length} tracks</span>
      </div>

      {quickPicks.length === 0 ? (
        <div className="hp-panel-empty">Add songs to unlock your mix.</div>
      ) : (
        <div className="hp-quick-grid">
          {quickPicks.slice(0, 6).map((song) => {
            const active = currentSong?.id === song.id;
            return (
              <button
                key={song.id}
                className={`hp-quick-card${active ? " is-active" : ""}`}
                onClick={() => {
                  onSetQueue(quickPicks, song);
                  onPlaySong(song, "quick_picks");
                }}
              >
                <div className="hp-quick-art-wrap">
                  <SongArtwork song={song} />
                  <span className="hp-quick-play">
                    {active && isPlaying ? (
                      <PlayingBars height={12} color="#050505" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </span>
                </div>
                <span className="hp-quick-title">{song.title}</span>
                <span className="hp-quick-sub">{song.artist}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>

    <section className="hp-pick-panel hp-recent-panel">
      <div className="hp-panel-head">
        <div>
          <span className="hp-panel-eyebrow">Pick up where you left off</span>
          <h2>Recently Played</h2>
        </div>
        <button
          className="hp-panel-action"
          onClick={() => onNavigate("/songs", "home_recent")}
        >
          See all
        </button>
      </div>

      {recentlyPlayedLoading ? (
        <div className="hp-recent-list">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="hp-recent-skeleton" key={index}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : recentlyPlayed.length === 0 ? (
        <div className="hp-panel-empty">
          Your recently played tracks will show up here.
        </div>
      ) : (
        <div className="hp-recent-list">
          {recentlyPlayed.slice(0, 6).map((entry, index) => {
            const songObj: Song = makeSong({
              id: entry.track_id || entry.id,
              title: entry.title,
              artist: entry.artist,
              album: entry.album,
              duration: entry.duration_secs || 0,
              artwork: entry.thumbnail,
              source: entry.source as any,
              path: entry.path || "",
              videoId: entry.video_id,
              dur: "",
            });
            const active = currentSong?.id === songObj.id;
            const playedAt = entry.played_at
              ? typeof entry.played_at === "number"
                ? entry.played_at * 1000
                : new Date(entry.played_at).getTime()
              : 0;

            return (
              <button
                key={entry.id || `${entry.track_id}-${index}`}
                className={`hp-recent-row${active ? " is-active" : ""}`}
                onClick={() => {
                  onSetQueue(recentlyPlayedAsSongs, songObj);
                  onPlaySong(songObj, "recently_played");
                }}
              >
                <span className="hp-recent-index">
                  {active && isPlaying ? (
                    <PlayingBars height={11} color="var(--accent)" />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <SongArtwork song={songObj} />
                <span className="hp-recent-info">
                  <span className="hp-recent-title">{entry.title}</span>
                  <span className="hp-recent-sub">{entry.artist}</span>
                </span>
                <span className="hp-recent-time">
                  {playedAt ? getTimeAgo(playedAt) : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  </div>
);

export default QuickPicks;
