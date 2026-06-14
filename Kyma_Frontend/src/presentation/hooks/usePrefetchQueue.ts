import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { logger } from "../../services/logger";

const PREFETCH_BEFORE_END = 20; // seconds
const PREFETCH_COUNT = 2; // songs ahead
const MIN_SONG_DURATION_FOR_PREFETCH = 25; // seconds - skip songs too short to benefit

export const usePrefetchQueue = () => {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const lastTriggerSongId = useRef<string | null>(null);

  const prefetchNextSongs = useCallback(async () => {
    const { queue, currentIndex } = useQueueStore.getState();
    const { currentSong, isPlaying, repeatMode, isShuffle } =
      usePlayerStore.getState();

    if (repeatMode === 2 || !isPlaying || !currentSong) return;

    // Skip if current song is too short to benefit from prefetch
    if ((currentSong.duration || 0) < MIN_SONG_DURATION_FOR_PREFETCH) return;

    // Can't deterministically peek shuffle order — skip prefetch in shuffle mode
    if (isShuffle) return;

    const songsToPrefetch: Song[] = [];

    for (let i = 1; i <= PREFETCH_COUNT; i++) {
      let nextIndex = currentIndex + i;

      // Wrap around for repeat-all
      if (repeatMode === 1 && nextIndex >= queue.length) {
        nextIndex = nextIndex % queue.length;
      }

      if (nextIndex >= queue.length) break;

      const song = queue[nextIndex];
      if (!song) break;

      // Skip local files
      if (song.path && !song.path.startsWith("http")) continue;

      // Skip if already prefetched or pending
      if (prefetchedRef.current.has(song.id) || pendingRef.current.has(song.id))
        continue;

      songsToPrefetch.push(song);
    }

    if (songsToPrefetch.length === 0) return;

    // Prefetch in parallel
    await Promise.all(
      songsToPrefetch.map(async (song) => {
        pendingRef.current.add(song.id);

        try {
          logger.logUI("Prefetch", "starting", {
            songId: song.id,
            title: song.title.slice(0, 50),
          });

          await tauriCommands.prefetchTrack(song);

          prefetchedRef.current.add(song.id);
          pendingRef.current.delete(song.id);

          logger.logUI("Prefetch", "complete", {
            songId: song.id,
          });
        } catch (error) {
          pendingRef.current.delete(song.id);
          // Don't log expected cancellations as errors
          if (String(error).includes("Already")) return;
          logger.logUI("Prefetch", "failed", {
            songId: song.id,
            error: String(error),
          });
        }
      }),
    );
  }, []);

  // Watch playback progress
  useEffect(() => {
    const interval = setInterval(() => {
      const state = usePlayerStore.getState();
      const { currentSong, isPlaying, currentProgress, duration } = state;

      if (!isPlaying || !currentSong || duration <= 0) return;

      const remaining = duration - currentProgress;

      // Skip prefetch for short songs
      if (duration < MIN_SONG_DURATION_FOR_PREFETCH) return;

      // Trigger prefetch when 20 seconds remain, but only once per song
      if (remaining <= PREFETCH_BEFORE_END && remaining > 0) {
        if (lastTriggerSongId.current !== currentSong.id) {
          lastTriggerSongId.current = currentSong.id;
          prefetchNextSongs();
        }
      }

      if (remaining > 30) {
        lastTriggerSongId.current = null;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prefetchNextSongs]);

  // Clear prefetch state when queue changes or user skips
  useEffect(() => {
    const unsubscribe = useQueueStore.subscribe((state, prevState) => {
      // Only clear if the queue actually changed (not just index)
      if (state.queue !== prevState.queue) {
        prefetchedRef.current.clear();
        pendingRef.current.clear();
        lastTriggerSongId.current = null;
        tauriCommands.cancelPrefetch([]).catch(() => {});
      }
    });

    return unsubscribe;
  }, []);

  // Clear everything on unmount
  useEffect(() => {
    return () => {
      prefetchedRef.current.clear();
      pendingRef.current.clear();
      tauriCommands.clearPrefetchCache().catch(() => {});
    };
  }, []);
};
