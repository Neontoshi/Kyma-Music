import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SongRow from "../components/Library/SongRow";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { resolveAndPlaySong } from "../hooks/useResolveAndPlay";
import { tauriCommands } from "../../services/tauriBridge";
import { randomGradient } from "../../lib/gradients";

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);

  useEffect(() => {
    tauriCommands.getPlaylists().then((data) => setPlaylists(data || [])).catch(() => {});
    tauriCommands.getSavedArtists().then((data) => setArtists(data || [])).catch(() => {});
  }, []);

  const popular = useMemo(
    () =>
      [...songs]
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 6),
    [songs],
  );

  const playSong = (song: (typeof songs)[number]) => {
    useQueueStore.getState().setQueue(popular, song, "library");
    resolveAndPlaySong(song);
  };

  return (
    <div className="song-list-pane library-page">
      <header className="library-hero">
        <div className="ap-page-eyebrow">Collection</div>
        <h1>Your Library</h1>
        <p>
          {songs.length} songs · {artists.length} artists · {playlists.length} playlists
        </p>
      </header>

      {artists.length > 0 && (
        <section className="hp-block">
          <div className="hp-block-head">
            <h2>Artists</h2>
            <button className="hp-see-all" onClick={() => navigate("/artists")}>
              See all
            </button>
          </div>
          <div className="library-artist-rail">
            {artists.slice(0, 8).map((artist) => (
              <button
                key={artist.artist_id || artist.name}
                className="library-artist-card"
                onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
              >
                <div
                  className="library-artist-avatar"
                  style={{ background: randomGradient(artist.name) }}
                >
                  {artist.thumbnail ? (
                    <img src={artist.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span>🎤</span>
                  )}
                </div>
                <span className="library-card-title">{artist.name}</span>
                <span className="library-card-sub">Artist</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="hp-block">
          <div className="hp-block-head">
            <h2>Playlists</h2>
            <button className="hp-see-all" onClick={() => navigate("/playlists")}>
              See all
            </button>
          </div>
          <div className="library-playlist-grid">
            {playlists.slice(0, 6).map((playlist) => (
              <button
                key={playlist.id}
                className="library-playlist-card"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
              >
                <div
                  className="library-playlist-art"
                  style={{ background: randomGradient(playlist.name) }}
                >
                  {playlist.emoji || "♪"}
                </div>
                <span className="library-card-title">{playlist.name}</span>
                <span className="library-card-sub">
                  {playlist.description || "Playlist"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="hp-block">
          <div className="hp-block-head">
            <h2>Popular Songs</h2>
            <button className="hp-see-all" onClick={() => navigate("/songs")}>
              See all
            </button>
          </div>
          <div className="library-song-list">
            {popular.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index}
                isCurrent={currentSong?.id === song.id}
                onPlay={() => playSong(song)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LibraryPage;
