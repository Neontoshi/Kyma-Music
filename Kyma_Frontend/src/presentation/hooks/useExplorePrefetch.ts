// Kyma_Frontend/src/presentation/hooks/useExplorePrefetch.ts
import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import { logger } from "../../services/logger";

const PREFETCH_COUNT = 3;

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const useExplorePrefetch = (tracks: Song[]) => {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const lastPrefetchedForId = useRef<string | null>(null);
  const tracksRef = useRef<Song[]>(tracks);
  const isResolvingRef = useRef(false);

  tracksRef.current = tracks;

  useEffect(() => {
    prefetchedRef.current.clear();
    lastPrefetchedForId.current = null;
  }, [tracks]);

  const prefetchNextBatch = async () => {
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;

    try {
      const currentTracks = tracksRef.current;
      const state = usePlayerStore.getState();
      const currentIdx = currentTracks.findIndex(
        (t) => t.id === state.currentSong?.id,
      );
      if (currentIdx < 0) return;

      const toResolve: Song[] = [];
      for (let i = 1; i <= PREFETCH_COUNT; i++) {
        const nextIdx = currentIdx + i;
        if (nextIdx >= currentTracks.length) break;
        const song = currentTracks[nextIdx];
        if (song.videoId || prefetchedRef.current.has(song.id)) continue;
        toResolve.push(song);
      }

      if (toResolve.length === 0) return;

      logger.logUI("ExplorePrefetch", "resolving", {
        count: toResolve.length,
        songs: toResolve.map((s) => s.title.slice(0, 30)),
      });

      for (const song of toResolve) {
        prefetchedRef.current.add(song.id);
        try {
          // Step 1: Find the YouTube video ID
          const results = await tauriCommands.searchYoutube(
            `${song.artist} - ${song.title}`,
            5,
          );
          if (results?.length) {
            const videoId = results[0].id;
            song.videoId = videoId;
            if (results[0].duration_secs) {
              song.duration = results[0].duration_secs;
              song.dur = formatDuration(results[0].duration_secs);
            }

            // Step 2: Resolve the actual stream URL and cache it
            await tauriCommands.prefetchTrack(song);

            logger.logUI("ExplorePrefetch", "resolved", {
              songId: song.id,
              title: song.title.slice(0, 30),
              videoId,
            });
          }
        } catch (e) {
          logger.logUI("ExplorePrefetch", "failed", {
            songId: song.id,
            error: String(e),
          });
        }
      }
    } finally {
      isResolvingRef.current = false;
    }
  };

  // Trigger prefetch whenever a new song starts playing
  useEffect(() => {
    const interval = setInterval(() => {
      const state = usePlayerStore.getState();
      const { currentSong, isPlaying, duration } = state;

      if (!isPlaying || !currentSong || duration <= 0) return;
      if (currentSong.path === "__resolving__") return;

      if (lastPrefetchedForId.current !== currentSong.id) {
        lastPrefetchedForId.current = currentSong.id;
        setTimeout(() => prefetchNextBatch(), 1000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return null;
};
