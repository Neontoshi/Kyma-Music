import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { getPlayerRepository } from "../../infrastructure/ServiceProvider";
import { tauriCommands } from "../../services/tauriBridge";
import { useLibraryStore } from "../stores/libraryStore";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../../services/logger";

const pendingPlayId = { current: null as string | null };

// 5-hour TTL matches the Rust backend cache — prevents replaying expired CDN URLs
const URL_CACHE_TTL_MS = 5 * 60 * 60 * 1000;

interface CachedUrl {
  url: string;
  cachedAt: number;
}

export const usePlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isLoading,
    setCurrentSong,
    setProgress,
    setPlaying,
    setVolume: setVolumeStore,
    toggleMute: toggleMuteStore,
    toggleShuffle: toggleShuffleStore,
    toggleRepeat: toggleRepeatStore,
  } = usePlayerStore();

  const { getNextSong, getPrevSong } = useQueueStore();
  const playerRepo = useRef(getPlayerRepository());
  const isLoadingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const ignorePositionUntil = useRef(0);
  const currentTrackIdRef = useRef(0);
  const lastPlayedId = useRef<string | null>(null);
  const songEndHandled = useRef(false);
  const streamingVideoId = useRef<string | null>(null);
  const scrobbledRef = useRef(false);
  const playLockRef = useRef(false);
  const urlCache = useRef<Map<string, CachedUrl>>(new Map());
  const generationRef = useRef(0);
  const playStartTime = useRef<number>(0);

  const getResolvedUrl = async (
    videoId: string,
    source: string,
  ): Promise<string> => {
    const cached = urlCache.current.get(videoId);
    const isStale = !cached || Date.now() - cached.cachedAt > URL_CACHE_TTL_MS;

    if (!isStale) {
      return cached!.url;
    }

    // Evict before resolving so a concurrent call doesn't return the old entry
    urlCache.current.delete(videoId);

    const resolved =
      source === "youtube"
        ? await tauriCommands.resolveYoutubeUrl(videoId)
        : await tauriCommands.resolveSoundcloudUrl(videoId);

    urlCache.current.set(videoId, { url: resolved, cachedAt: Date.now() });
    return resolved;
  };

  const playSong = useCallback(async (song: typeof currentSong) => {
    if (!song) return;

    // Claim this generation — any older in-flight load will see a mismatch and bail
    const generation = ++generationRef.current;

    // Force-release the lock so the new song isn't blocked by the previous load
    playLockRef.current = false;

    if (song.id === lastPlayedId.current) return;
    if (song.id === pendingPlayId.current) return;

    playStartTime.current = Date.now();
    logger.logUI("Player", "play_start", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: song.source,
      isStream: song.source === "youtube" || song.source === "soundcloud",
    });

    playLockRef.current = true;
    let loadingStart = 0;
    let wasPaused = false;

    try {
      playerRepo.current.reset();
      usePlayerStore.getState().setError(null);
      scrobbledRef.current = false;
      wasPaused = !usePlayerStore.getState().isPlaying;

      pendingPlayId.current = song.id;
      lastPlayedId.current = song.id;

      if (song.videoId) streamingVideoId.current = song.videoId;

      currentTrackIdRef.current = Number.MAX_SAFE_INTEGER;
      songEndHandled.current = false;
      setProgress(0);
      usePlayerStore.getState().setDuration(0);
      streamingVideoId.current = song.videoId ?? null;

      try {
        await playerRepo.current.stop();
      } catch {}

      ignorePositionUntil.current = Date.now() + 120;

      const isStream =
        song.source === "youtube" || song.source === "soundcloud";
      if (isStream) {
        isLoadingRef.current = true;
        usePlayerStore.getState().setIsLoading(true);
        loadingStart = Date.now();
      }

      if (
        (song.source === "youtube" || song.source === "soundcloud") &&
        song.videoId
      ) {
        const resolvedUrl = await getResolvedUrl(
          song.videoId,
          song.source || "youtube",
        );

        // Stale — a newer song was requested while we were resolving
        if (generationRef.current !== generation) return;

        currentTrackIdRef.current = Date.now();
        const trackId = await playerRepo.current.play({
          ...song,
          path: resolvedUrl,
          source: "local",
        });

        if (generationRef.current !== generation) return;

        currentTrackIdRef.current = trackId;
      } else {
        currentTrackIdRef.current = Date.now();
        const trackId = await playerRepo.current.play(song);

        if (generationRef.current !== generation) return;

        currentTrackIdRef.current = trackId;
      }
      if (wasPaused) await playerRepo.current.pause();

      const loadTime = Date.now() - playStartTime.current;
      logger.logUI("Player", "play_success", {
        songId: song.id,
        title: song.title.slice(0, 50),
        loadTimeMs: loadTime,
        wasPaused,
      });

      if (generationRef.current === generation && (song.path || song.videoId)) {
        tauriCommands
          .savePlayHistory({
            songId: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || "",
            durationSecs: song.duration || 0,
            thumbnail:
              song.artwork ||
              (song.videoId
                ? `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
                : ""),
            videoId: song.videoId || undefined,
            source: song.source || "local",
            path: song.path || "",
          })
          .then(() => {
            tauriCommands
              .getWeeklyStats()
              .then((stats: any) => {
                import("../stores/homeDataStore").then(
                  ({ useHomeDataStore }) => {
                    useHomeDataStore.setState({ weeklyStats: stats });
                  },
                );
              })
              .catch(() => {});
            tauriCommands
              .getAllTimeStats()
              .then((stats: any) => {
                import("../stores/homeDataStore").then(
                  ({ useHomeDataStore }) => {
                    useHomeDataStore.setState({ allTimeStats: stats });
                  },
                );
              })
              .catch(() => {});
          })
          .catch(() => {});
      }
    } catch (err) {
      // Only handle error if this is still the active song
      if (generationRef.current !== generation) return;

      logger.logError("Player play_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        error: err,
      });

      if (song?.videoId) {
        urlCache.current.delete(song.videoId);
        try {
          await tauriCommands.invalidateStreamUrl(song.videoId);
        } catch {}

        try {
          playerRepo.current.reset();
          const freshUrl =
            song.source === "youtube"
              ? await tauriCommands.resolveYoutubeUrl(song.videoId)
              : await tauriCommands.resolveSoundcloudUrl(song.videoId);

          if (generationRef.current !== generation) return;

          urlCache.current.set(song.videoId, {
            url: freshUrl,
            cachedAt: Date.now(),
          });
          const trackId = await playerRepo.current.play({
            ...song,
            path: freshUrl,
            source: "local",
          });

          if (generationRef.current !== generation) return;

          currentTrackIdRef.current = trackId;
          if (wasPaused) await playerRepo.current.pause();
          return;
        } catch (retryErr) {
          logger.logError("Player retry_failed", {
            songId: song.id,
            title: song.title.slice(0, 50),
            error: retryErr,
          });
        }
      }

      currentTrackIdRef.current = Number.MAX_SAFE_INTEGER;
      lastPlayedId.current = null;
      streamingVideoId.current = null;
      isLoadingRef.current = false;
      usePlayerStore.getState().setIsLoading(false);
      usePlayerStore.getState().setError(String(err));
      usePlayerStore.getState().setPlaying(false);
      usePlayerStore.getState().setProgress(0);
      usePlayerStore.getState().setDuration(0);
    } finally {
      // Only clean up if this generation is still active
      if (generationRef.current === generation) {
        if (loadingStart) {
          const elapsed = Date.now() - loadingStart;
          if (elapsed < 300)
            await new Promise((r) => setTimeout(r, 300 - elapsed));
        }
        pendingPlayId.current = null;
        playLockRef.current = false;
        isLoadingRef.current = false;
        usePlayerStore.getState().setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentSong) return;
    playSong(currentSong);
  }, [currentSong?.id]);

  const handleNext = useCallback(() => {
    const state = usePlayerStore.getState();
    logger.logUI("Player", "next_requested", {
      isShuffle: state.isShuffle,
      repeatMode: state.repeatMode,
    });

    const nextSong = getNextSong(state.isShuffle, state.repeatMode);

    if (nextSong) {
      logger.logUI("Player", "next_song_found", {
        title: nextSong.title.slice(0, 50),
        source: nextSong.source,
        videoId: nextSong.videoId,
      });

      lastPlayedId.current = null;
      setCurrentSong(nextSong);
      setProgress(0);
      usePlayerStore.getState().setDuration(0);
      ignorePositionUntil.current = Date.now() + 120;
    } else {
      logger.logUI("Player", "next_song_not_found", {
        queueEmpty: useQueueStore.getState().queue.length === 0,
      });

      const store = usePlayerStore.getState();

      playerRepo.current.stop();
      store.setPlaying(false);
      store.setProgress(store.duration);

      songEndHandled.current = false;
      lastPlayedId.current = null;
      currentTrackIdRef.current = Number.MAX_SAFE_INTEGER;
    }
  }, [getNextSong, setCurrentSong, setProgress]);

  useEffect(() => {
    let lastUpdate = 0;

    const unsubscribe = playerRepo.current.onPlaybackUpdate(
      (position, duration, backendIsPlaying, eventTrackId, buffered) => {
        if (eventTrackId !== currentTrackIdRef.current) {
          return;
        }
        const store = usePlayerStore.getState();

        if (store.isPlaying !== backendIsPlaying) {
          store.setPlaying(backendIsPlaying);
        }

        store.setBuffered(buffered ?? 1.0);

        if (isLoadingRef.current) {
          isLoadingRef.current = false;
          store.setIsLoading(false);
        }

        if (Date.now() < ignorePositionUntil.current) {
          return;
        }

        if (store.duration === 0 && duration > 0) {
          store.setDuration(duration);

          // Update the song in library with correct duration
          const current = store.currentSong;
          if (current && current.duration === 0) {
            const formatDuration = (secs: number): string => {
              const m = Math.floor(secs / 60);
              const s = Math.floor(secs % 60)
                .toString()
                .padStart(2, "0");
              return `${m}:${s}`;
            };
            const updatedSong = {
              ...current,
              duration: duration,
              dur: formatDuration(duration),
            };
            useLibraryStore.getState().updateSong(updatedSong);
          }
        }
        if (isSeekingRef.current) {
          return;
        }

        const now = Date.now();
        if (now - lastUpdate > 80) {
          lastUpdate = now;
          const currentDuration = usePlayerStore.getState().duration;
          if (currentDuration === 0 && position > 0) return;

          if (!backendIsPlaying && position >= duration) {
            setProgress(duration);
            return;
          }

          const safePosition = Math.min(position, duration);
          setProgress(isNaN(safePosition) ? 0 : safePosition);

          if (
            !scrobbledRef.current &&
            duration > 0 &&
            position >= Math.min(store.duration / 2, 240)
          ) {
            scrobbledRef.current = true;
            const song = usePlayerStore.getState().currentSong;
            if (song) {
              logger.logUI("Player", "scrobble_triggered", {
                songId: song.id,
                title: song.title.slice(0, 50),
                position: position.toFixed(1),
              });
              tauriCommands.getSetting("listenbrainz_token").then((token) => {
                if (token) {
                  tauriCommands.scrobbleListenbrainz(
                    token,
                    song.artist,
                    song.title,
                    song.album || "",
                  );
                }
              });
            }
          }
        }

        if (
          duration > 2 &&
          position >= duration - 2 &&
          !songEndHandled.current &&
          Date.now() >= ignorePositionUntil.current
        ) {
          songEndHandled.current = true;
          if (store.repeatMode === 2) {
            // Repeat one
            const song = store.currentSong;
            const isStream =
              song?.source === "youtube" || song?.source === "soundcloud";
            if (isStream && song) {
              logger.logUI("Player", "repeat_one", {
                songId: song.id,
                title: song.title.slice(0, 50),
              });
              lastPlayedId.current = null;
              playSong(song);
            } else {
              playerRepo.current.seek(0);
              playerRepo.current.resume();
              setProgress(0);
              songEndHandled.current = false;
            }
          } else {
            // Repeat all (1), no repeat (0), or queue mode — go to next song
            handleNext();
          }
        }
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    invoke("set_volume", { level: effectiveVolume / 100 }).catch(console.error);
  }, [volume, isMuted]);

  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("tray-next", () => {
        logger.logUI("Player", "tray_next", {});
        lastPlayedId.current = null;
        handleNext();
      }).then((fn) => (unlisten1 = fn));

      listen("tray-prev", () => {
        const prev = getPrevSong();
        if (prev) {
          logger.logUI("Player", "tray_prev", {
            songId: prev.id,
            title: prev.title.slice(0, 50),
          });
          lastPlayedId.current = null;
          setCurrentSong(prev);
          setProgress(0);
          ignorePositionUntil.current = Date.now() + 120;
          try {
            playerRepo.current.stop();
          } catch {}
        }
      }).then((fn) => (unlisten2 = fn));
    });

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  const togglePlay = async () => {
    const current = usePlayerStore.getState().isPlaying;
    const next = !current;
    logger.logUI("Player", "toggle_play", {
      from: current ? "playing" : "paused",
      to: next ? "playing" : "paused",
    });
    setPlaying(next);
    try {
      if (current) await playerRepo.current.pause();
      else await playerRepo.current.resume();
    } catch (err) {
      logger.logError("Player toggle_play_failed", { error: err });
      setPlaying(current);
      console.error(err);
    }
  };

  const seek = async (position: number) => {
    const currentPos = usePlayerStore.getState().currentProgress;
    logger.logUI("Player", "seek_requested", {
      from: currentPos.toFixed(1),
      to: position.toFixed(1),
      songId: currentSong?.id,
      title: currentSong?.title?.slice(0, 50),
    });

    isSeekingRef.current = true;
    songEndHandled.current = true;
    ignorePositionUntil.current = Date.now() + 500; // block stale events for 500ms
    setProgress(position);
    try {
      await playerRepo.current.seek(position);
      logger.logUI("Player", "seek_completed", { to: position.toFixed(1) });
    } catch (err) {
      logger.logError("Player seek_failed", { position, error: err });
      console.error("Seek failed:", err);
    }
    setTimeout(() => {
      isSeekingRef.current = false;
      const { currentProgress, duration } = usePlayerStore.getState();
      if (duration <= 2 || currentProgress < duration - 2) {
        songEndHandled.current = false;
      }
    }, 300);
  };

  const nextSong = () => {
    logger.logUI("Player", "next_triggered", {});
    lastPlayedId.current = null;
    handleNext();
  };

  const prevSong = () => {
    const prev = getPrevSong();
    if (prev) {
      logger.logUI("Player", "prev_triggered", {
        songId: prev.id,
        title: prev.title.slice(0, 50),
      });
      lastPlayedId.current = null;
      setCurrentSong(prev);
      setProgress(0);
      ignorePositionUntil.current = Date.now() + 120;

      try {
        playerRepo.current.stop();
      } catch {}
    } else {
      logger.logUI("Player", "prev_not_available", {});
    }
  };

  const setVolume = (v: number) => setVolumeStore(v);
  const toggleMute = () => toggleMuteStore();

  return {
    currentSong,
    isPlaying,
    currentProgress: usePlayerStore.getState().currentProgress,
    volume: isMuted ? 0 : volume,
    isShuffle,
    repeatMode,
    isLoading,
    togglePlay,
    setProgress: seek,
    setVolume,
    toggleMute,
    toggleShuffle: toggleShuffleStore,
    toggleRepeat: toggleRepeatStore,
    nextSong,
    prevSong,
  };
};
