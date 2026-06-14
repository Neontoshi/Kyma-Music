import { create } from "zustand";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "./playerStore";
import { logger } from "../../services/logger";

export type QueueSource = "library" | "search" | "playlist" | "none";

interface QueueStore {
  queue: Song[];
  currentIndex: number;
  source: QueueSource;

  setQueue: (
    songs: Song[],
    startSong: Song,
    source: QueueSource,
  ) => Promise<void>;
  getNextSong: (isShuffle: boolean, repeatMode: number) => Song | null;
  getPrevSong: () => Song | null;
  setIndex: (index: number) => void;
  clearQueue: () => Promise<void>;
  removeFromQueue: (songId: string) => Promise<void>;
  _hydrate: () => Promise<void>;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  queue: [],
  currentIndex: -1,
  source: "none",

  _hydrate: async () => {
    try {
      const backendQueue = await tauriCommands.getQueue();
      const currentQueue = get().queue;
      const currentIndex = get().currentIndex;

      const tagMap = new Map<string, "next">();
      for (const s of currentQueue) {
        if (s.queueTag === "next") tagMap.set(s.id, "next");
      }

      const mergedQueue = backendQueue.map((s: Song) => {
        const existingTag = tagMap.get(s.id);
        return existingTag ? { ...s, queueTag: existingTag as "next" } : s;
      });

      const currentSongId = usePlayerStore.getState().currentSong?.id;
      const newIndex = currentSongId
        ? mergedQueue.findIndex((s: Song) => s.id === currentSongId)
        : currentIndex;

      set({
        queue: mergedQueue,
        currentIndex: newIndex !== -1 ? newIndex : currentIndex,
      });
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
  },

  setQueue: async (songs, startSong, source) => {
    const startIndex = songs.findIndex((s) => s.id === startSong.id);
    const state = {
      queue: songs,
      currentIndex: startIndex >= 0 ? startIndex : 0,
      source,
    };
    set(state);

    await tauriCommands.setQueue(songs);
  },

  getNextSong: (isShuffle, repeatMode) => {
    const { queue, currentIndex } = get();

    logger.logUI("QueueStore", "getNextSong", {
      queueLength: queue.length,
      currentIndex,
      isShuffle,
      repeatMode,
    });

    if (queue.length === 0) {
      return null;
    }

    if (isShuffle) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * queue.length);
      } while (randomIndex === currentIndex && queue.length > 1);
      set({ currentIndex: randomIndex });
      return queue[randomIndex];
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({ currentIndex: nextIndex });
      return queue[nextIndex];
    }

    if (repeatMode === 1) {
      // Repeat all - wrap around
      set({ currentIndex: 0 });
      return queue[0];
    }

    // repeatMode 0 or 2 - no more songs
    return null;
  },

  getPrevSong: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return null;

    const prevIndex = currentIndex - 1;
    const newIndex = prevIndex >= 0 ? prevIndex : queue.length - 1;
    set({ currentIndex: newIndex });
    return queue[newIndex];
  },

  setIndex: (index) => {
    set({ currentIndex: index });
  },

  clearQueue: async () => {
    await tauriCommands.clearQueue();
    set({
      queue: [],
      currentIndex: -1,
      source: "none",
    });
  },

  removeFromQueue: async (songId: string) => {
    const { currentIndex, queue } = get();
    const removedIdx = queue.findIndex((s) => s.id === songId);

    await tauriCommands.removeFromQueue(songId);
    const newQueue = await tauriCommands.getQueue();

    const newIndex =
      removedIdx !== -1 && removedIdx < currentIndex
        ? currentIndex - 1
        : currentIndex;

    set({ queue: newQueue || [], currentIndex: newIndex });
  },
}));
