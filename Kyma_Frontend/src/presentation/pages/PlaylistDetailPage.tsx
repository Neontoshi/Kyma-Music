import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useLibraryStore } from "../stores/libraryStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { formatDuration, formatTotalDuration } from "../../lib/formatTime";
import { randomGradient } from "../../lib/gradients";
import PlayingBars from "../components/PlayingBars";
import { makeSong } from "../../lib/song";

const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any>(null);
  const librarySongs = useLibraryStore((s) => s.songs);
  const toggleLikeSong = useLibraryStore((s) => s.toggleLike);
  const likedSongs = useMemo(
    () => new Set(librarySongs.filter((s) => s.liked).map((s) => s.id)),
    [librarySongs],
  );
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [data, playlists] = await Promise.all([
        tauriCommands.getPlaylistSongs(id!),
        tauriCommands.getPlaylists(),
      ]);
      setSongs(data || []);
      const pl = playlists.find((p: any) => p.id === id);
      if (pl) setPlaylist(pl);
    } catch (err) {
      console.error("Failed to load playlist:", err);
    }
  };

  const handlePlay = (_song: any, index: number) => {
    const songList: Song[] = songs.map((s) =>
      makeSong({
        id: s.song_id,
        path: s.path,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration_secs,
        artwork: s.thumbnail,
        source: s.source as any,
        videoId: s.video_id || undefined,
        dur: formatDuration(s.duration_secs),
        grad: randomGradient(),
        liked: likedSongs.has(s.song_id),
      }),
    );
    setQueue(songList, songList[index], "playlist");
    setCurrentSong(songList[index]);
    setProgress(0);
  };

  const handleRemove = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    try {
      await tauriCommands.removeFromPlaylist(id!, songId);
      loadData();
    } catch (err) {
      console.error("Failed to remove song:", err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm(`Delete "${playlist?.name}"?`)) return;
    try {
      await tauriCommands.removePlaylist(id!);
      navigate("/playlists");
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const toggleLike = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    const raw = songs.find((s) => s.song_id === songId);
    const songData = raw
      ? makeSong({
          id: raw.song_id,
          path: raw.path,
          title: raw.title,
          artist: raw.artist,
          album: raw.album,
          duration: raw.duration_secs,
          artwork: raw.thumbnail,
          source: raw.source,
          videoId: raw.video_id || undefined,
          dur: formatDuration(raw.duration_secs),
          grad: randomGradient(),
          liked: likedSongs.has(raw.song_id),
        })
      : undefined;
    const isLiked = likedSongs.has(songId);

    void toggleLikeSong(songId, isLiked ? undefined : songData).catch((err) => {
      console.error("Failed to toggle like:", err);
    });
  };

  const currentSongIndex = songs.findIndex(
    (s) => s.song_id === currentSong?.id,
  );
  const totalDuration = songs.reduce(
    (acc, song) => acc + (song.duration_secs || 0),
    0,
  );

  return (
    <div className="playlist-detail-page">
      <div className="playlist-detail-inner">
        <button
          className="album-detail-back"
          onClick={() => navigate("/playlists")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Playlists
        </button>

        <section className="playlist-detail-hero">
          <div
            className="playlist-detail-art"
            style={{ background: randomGradient(playlist?.name || "Playlist") }}
          >
            <span>{playlist?.emoji || "♪"}</span>
          </div>
          <div className="playlist-detail-copy">
            <div className="playlist-detail-eyebrow">Playlist</div>
            <h1>{playlist?.name || "Playlist"}</h1>
            <p>
              {playlist?.description ||
                "A collection of tracks put together by you."}
            </p>
            <div className="playlist-detail-stats">
              <span>
                <strong>{songs.length}</strong> track
                {songs.length === 1 ? "" : "s"}
              </span>
              <span className="playlist-detail-dot" />
              <span>
                <strong>{formatTotalDuration(totalDuration)}</strong>
              </span>
            </div>
            <div className="playlist-detail-actions">
              <button
                className="album-detail-play"
                onClick={() => songs.length > 0 && handlePlay(songs[0], 0)}
                disabled={songs.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="13"
                  height="13"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Play all
              </button>
              <button
                className="playlist-delete-btn"
                onClick={handleDeletePlaylist}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </section>

        <section className="artist-all-songs playlist-tracks-panel">
          <div className="artist-section-head">
            <h2>Tracks</h2>
            <span>{songs.length}</span>
          </div>

          {songs.length === 0 ? (
            <div className="playlist-detail-empty">
              <div className="playlist-detail-empty-icon">♪</div>
              <h3>This playlist is empty</h3>
              <p>Add songs from your library to start shaping it.</p>
            </div>
          ) : (
            <div className="playlist-detail-tracks">
              {songs.map((song, i) => {
                const isCurrent = currentSongIndex === i;
                const isLiked = likedSongs.has(song.song_id);
                return (
                  <div
                    key={song.song_id}
                    className={`song-row${isCurrent ? " playing" : ""}`}
                    onClick={() => handlePlay(song, i)}
                  >
                    <div className="song-num">
                      {isCurrent && isPlaying ? (
                        <PlayingBars />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div className="song-thumb">
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt="" />
                      ) : (
                        <div
                          className="song-thumb-inner"
                          style={{ background: randomGradient(song.title) }}
                        >
                          🎵
                        </div>
                      )}
                    </div>
                    <div className="song-info">
                      <div className="song-name">{song.title}</div>
                      <div className="song-artist">{song.artist}</div>
                    </div>
                    <div className="song-album">{song.album || "—"}</div>
                    <div className="song-dur">
                      {formatDuration(song.duration_secs)}
                    </div>
                    <div className="song-actions">
                      <button
                        className={`playlist-row-action${isLiked ? " is-liked" : ""}`}
                        onClick={(e) => toggleLike(e, song.song_id)}
                        aria-label="Like song"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill={isLiked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                      </button>
                      <button
                        className="playlist-row-action"
                        onClick={(e) => handleRemove(e, song.song_id)}
                        aria-label="Remove from playlist"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
