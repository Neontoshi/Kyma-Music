import { useEffect, useState, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { getSongRepository } from "../../infrastructure/ServiceProvider";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "../stores/playerStore";
import { logger } from "../../services/logger";

export const useLibrary = () => {
  const {
    songs,
    filteredSongs,
    searchQuery,
    activeGenre,
    activeSort,
    setSongs,
    setSearchQuery,
    setActiveGenre,
    setActiveSort,
    filterAndSort,
    toggleLike,
  } = useLibraryStore();
  const [loading, setLoading] = useState(songs.length === 0);
  const [error, setError] = useState<string | null>(null);
  const triggerReload = useLibraryStore((s) => s.triggerReload);
  const reloadStartTime = useRef<number>(0);

  useEffect(() => {
    if (songs.length === 0) {
      loadSongs();
    }
  }, []);

  useEffect(() => {
    if (triggerReload > 0) loadSongs(true);
  }, [triggerReload]);

  const loadSongs = async (forceRescan = false) => {
    reloadStartTime.current = Date.now();
    const loadType = forceRescan ? "rescan" : "initial";
    logger.logUI("Library", `${loadType}_start`, { forceRescan });

    try {
      const currentSongs = useLibraryStore.getState().songs;
      if (!forceRescan && currentSongs.length > 0) {
        logger.logUI("Library", "load_from_cache", {
          songCount: currentSongs.length,
        });
        const likedIds = new Set<string>(await tauriCommands.getLikedSongs());
        const likedFull: any[] = await tauriCommands.getLikedSongsFull();
        const existingIds = new Set(currentSongs.map((s: any) => s.id));
        const newSongs = likedFull
          .filter((s: any) => !existingIds.has(s.id))
          .map((s: any) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            duration: s.duration_secs,
            artwork: s.thumbnail,
            videoId: s.video_id,
            source: s.source,
            path: s.path,
            liked: likedIds.has(s.id),
            dur: "",
            emoji: "🎵",
            grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
            bpm: 0,
            key: "—",
            plays: 0,
          }));
        const updated = currentSongs.map((s: any) => ({
          ...s,
          liked: likedIds.has(s.id),
        }));
        setSongs([...updated, ...newSongs]);

        const loadTime = Date.now() - reloadStartTime.current;
        logger.logUI("Library", "load_complete", {
          type: "cache",
          songCount: updated.length + newSongs.length,
          newSongsCount: newSongs.length,
          loadTimeMs: loadTime,
        });
        return;
      }

      if (!forceRescan) {
        setLoading(true);
      }
      setError(null);

      logger.logUI("Library", "fetch_from_backend", { forceRescan });

      const songRepo = getSongRepository();
      const loadedSongs = forceRescan
        ? await (songRepo as any).rescanLibrary()
        : await songRepo.getAllSongs();

      const likedIds = new Set<string>(await tauriCommands.getLikedSongs());
      const likedFull: any[] = await tauriCommands.getLikedSongsFull();

      const updated = loadedSongs.map((s: any) => ({
        ...s,
        liked: likedIds.has(s.id),
      }));

      const existingIds = new Set(updated.map((s: any) => s.id));
      const newSongs = likedFull
        .filter((s: any) => !existingIds.has(s.id))
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          duration: s.duration_secs,
          artwork: s.thumbnail,
          videoId: s.video_id,
          source: s.source,
          path: s.path,
          liked: likedIds.has(s.id),
          dur: "",
          emoji: "🎵",
          grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
          bpm: 0,
          key: "—",
          plays: 0,
        }));

      setSongs([...updated, ...newSongs]);

      const loadTime = Date.now() - reloadStartTime.current;
      logger.logUI("Library", "load_complete", {
        type: forceRescan ? "rescan" : "full",
        songCount: updated.length + newSongs.length,
        backendCount: loadedSongs.length,
        likedCount: likedIds.size,
        loadTimeMs: loadTime,
      });
    } catch (err) {
      const loadTime = Date.now() - reloadStartTime.current;
      logger.logError("Library load_failed", {
        forceRescan,
        loadTimeMs: loadTime,
        error: err,
      });
      console.error("Failed to load songs:", err);
      const friendlyMsg =
        "Couldn't load your music library. Try restarting the app or checking your music folder.";
      setError(friendlyMsg);
      usePlayerStore.getState().setError(friendlyMsg);
      // Still log technical error to console for debugging
      console.error("Technical error:", err);
    } finally {
      if (!forceRescan) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    filterAndSort();
  }, [searchQuery, activeGenre, activeSort, songs]);

  return {
    songs: filteredSongs,
    allSongs: songs,
    searchQuery,
    activeGenre,
    activeSort,
    loading,
    error,
    setSearchQuery,
    setActiveGenre,
    setActiveSort,
    toggleLike,
    reloadSongs: loadSongs,
  };
};
