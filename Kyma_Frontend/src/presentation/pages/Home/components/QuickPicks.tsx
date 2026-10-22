// Kyma_Frontend/src/presentation/pages/Home/components/QuickPicks.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import TrackRow from "../sub-components/TrackRow";
import SongArt from "../sub-components/SongArt";
import getTimeAgo from "../helpers/timeAgo";
import { makeSong } from "../../../../lib/song";

interface QuickPicksProps {
  quickPicks: Song[];
  recentlyPlayed: any[];
  recentlyPlayedLoading: boolean;
  recentlyPlayedAsSongs: Song[];
  likedSongsPreview: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
  onNavigate: (path: string, from: string) => void;
}

const QuickPicks: React.FC<QuickPicksProps> = ({
  quickPicks,
  recentlyPlayed,
  recentlyPlayedLoading,
  recentlyPlayedAsSongs,
  likedSongsPreview,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
  onNavigate,
}) => (
  <div
    className="hp-section"
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "2rem",
      animationDelay: "0.15s",
    }}
  >
    {/* Quick Picks */}
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "16px",
      }}
    >
      <SectionHeader label="Quick Picks" sub="shuffled" />
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {quickPicks.slice(0, 5).map((s) => (
          <TrackRow
            key={s.id}
            song={s}
            isActive={currentSong?.id === s.id}
            isPlaying={isPlaying}
            onClick={() => {
              onSetQueue(quickPicks, s);
              onPlaySong(s, "quick_picks");
            }}
            showTime
          />
        ))}
      </div>
    </div>

    {/* Recently Played / Liked Songs fallback */}
    {recentlyPlayedLoading ? (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "16px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 120,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="ap-spinner ap-spinner--sm"
            style={{ margin: "0 auto 8px" }}
          />
          <div
            style={{
              fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
              fontSize: "10px",
              color: "var(--text3)",
            }}
          >
            Loading recent plays…
          </div>
        </div>
      </div>
    ) : recentlyPlayed.length > 0 ? (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "16px",
        }}
      >
        <SectionHeader label="Recently Played" sub="History" />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {recentlyPlayed.slice(0, 5).map((entry, i) => {
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
            return (
              <div
                key={entry.id || `${entry.track_id}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onClick={() => {
                  onSetQueue(recentlyPlayedAsSongs, songObj);
                  onPlaySong(songObj, "recently_played");
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--surface2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <SongArt
                  artwork={entry.thumbnail}
                  videoId={entry.video_id}
                  emoji="🎵"
                  grad="linear-gradient(135deg, var(--accent), var(--accent2))"
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
                    }}
                  >
                    {entry.title}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--text3)",
                      marginTop: "1px",
                    }}
                  >
                    {entry.artist}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                    fontSize: "9px",
                    color: "var(--text3)",
                    flexShrink: 0,
                  }}
                >
                  {(() => {
                    if (!entry.played_at) return "";
                    const ts =
                      typeof entry.played_at === "number"
                        ? entry.played_at * 1000
                        : new Date(entry.played_at).getTime();
                    return getTimeAgo(ts);
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      likedSongsPreview.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "16px",
          }}
        >
          <SectionHeader
            label="❤ Liked"
            sub="songs you love"
            action={{
              label: "See all",
              onClick: () => onNavigate("/liked", "home_liked_section"),
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {likedSongsPreview.slice(0, 5).map((s) => (
              <TrackRow
                key={s.id}
                song={s}
                isActive={currentSong?.id === s.id}
                isPlaying={isPlaying}
                onClick={() => {
                  onSetQueue(likedSongsPreview, s);
                  onPlaySong(s, "liked_section");
                }}
                showTime
              />
            ))}
          </div>
        </div>
      )
    )}
  </div>
);

export default QuickPicks;
