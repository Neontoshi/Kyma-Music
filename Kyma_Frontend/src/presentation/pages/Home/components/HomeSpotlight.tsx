import React from "react";
import { Song } from "../../../../core/entities/Song";

interface MixCard {
  label: string;
  subtitle: string;
  gradient: string;
  songs: Song[];
}

interface AlbumCard {
  id: string;
  title: string;
  artist: string;
  art?: string;
  emoji?: string;
  album?: any;
}

interface HomeSpotlightProps {
  recentlyPlayed: Song[];
  mixes: MixCard[];
  albums: AlbumCard[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
  onAlbumClick: (album: any) => void;
  onNavigate: (path: string, from: string) => void;
}

const SongArtwork: React.FC<{ song: Song; size?: number }> = ({
  song,
  size = 64,
}) => {
  const src =
    song.artwork ||
    (song.videoId ? `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` : "");
  return (
    <div
      className="hp-song-art"
      style={{
        width: size,
        height: size,
        background: song.grad || "var(--surface3)",
      }}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{song.emoji || "♪"}</span>}
    </div>
  );
};

const HomeSpotlight: React.FC<HomeSpotlightProps> = ({
  recentlyPlayed,
  mixes,
  albums,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
  onAlbumClick,
  onNavigate,
}) => (
  <>
    {recentlyPlayed.length > 0 && (
      <section className="hp-block">
        <div className="hp-block-head">
          <h2>Recently Played</h2>
          <button
            className="hp-see-all"
            onClick={() => onNavigate("/songs", "home_recent")}
          >
            See all
          </button>
        </div>
        <div className="hp-song-rail">
          {recentlyPlayed.slice(0, 6).map((song) => {
            const active = currentSong?.id === song.id;
            return (
              <button
                key={song.id}
                className={`hp-song-card${active ? " active" : ""}`}
                onClick={() => {
                  onSetQueue(recentlyPlayed, song);
                  onPlaySong(song, "recently_played");
                }}
              >
                <SongArtwork song={song} />
                <span className="hp-song-title">{song.title}</span>
                <span className="hp-song-sub">{song.artist}</span>
                {active && isPlaying && (
                  <span className="hp-song-playing">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    )}

    {mixes.length > 0 && (
      <section className="hp-block">
        <div className="hp-block-head">
          <h2>Made For You</h2>
          <button
            className="hp-see-all"
            onClick={() => onNavigate("/for-you", "home_made_for_you")}
          >
            See all
          </button>
        </div>
        <div className="hp-mix-grid">
          {mixes.map((mix) => (
            <button
              key={mix.label}
              className="hp-mix-card"
              style={{ background: mix.gradient }}
              onClick={() => {
                onSetQueue(mix.songs, mix.songs[0]);
                onPlaySong(mix.songs[0], "made_for_you");
              }}
            >
              <span className="hp-mix-badge">Made for you</span>
              <span className="hp-mix-label">{mix.label}</span>
              <span className="hp-mix-sub">{mix.subtitle}</span>
              <span className="hp-mix-play">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </section>
    )}

    {albums.length > 0 && (
      <section className="hp-block">
        <div className="hp-block-head">
          <h2>Recommended Albums</h2>
          <button
            className="hp-see-all"
            onClick={() => onNavigate("/albums", "home_recommended_albums")}
          >
            See all
          </button>
        </div>
        <div className="hp-album-grid">
          {albums.slice(0, 5).map((album) => (
            <button
              key={album.id}
              className="hp-album-card"
              onClick={() => onAlbumClick(album.album || album)}
            >
              <div
                className="hp-album-art"
                style={{
                  background:
                    album.album?.grad ||
                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, #0a0a0a), #080808)",
                }}
              >
                {album.art ? (
                  <img src={album.art} alt="" loading="lazy" />
                ) : (
                  <span>{album.emoji || "💿"}</span>
                )}
              </div>
              <span className="hp-album-title">{album.title}</span>
              <span className="hp-album-sub">{album.artist}</span>
            </button>
          ))}
        </div>
      </section>
    )}
  </>
);

export default HomeSpotlight;
