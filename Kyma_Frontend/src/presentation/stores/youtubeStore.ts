import { create } from "zustand";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import { randomGradient } from "../../lib/gradients";
import { makeSong } from "../../lib/song";

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  duration_str: string;
  thumbnail: string;
}

interface YouTubeStore {
  results: Song[];
  isSearching: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastQuery: string;
  offset: number;

  requestId: number;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  downloadAudio: (videoId: string, title: string) => Promise<string | null>;
}

function randomEmoji(): string {
  const emojis = ["🎵", "🎶", "🎧", "🎤", "🎼", "🎹", "🎸", "🥁", "🎺", "🎷"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function toSong(r: YouTubeSearchResult): Song {
  return makeSong({
    id: `yt-${r.id}`,
    title: r.title,
    artist: r.artist || "YouTube",
    album: "YouTube",
    duration: r.duration_secs,
    source: "youtube",
    videoId: r.id,
    dur: r.duration_str,
    emoji: randomEmoji(),
    grad: randomGradient(),
  });
}

export const useYouTubeStore = create<YouTubeStore>((set, get) => ({
  results: [],
  isSearching: false,
  isLoadingMore: false,
  error: null,
  lastQuery: "",
  offset: 0,
  requestId: 0,

  search: async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      set({ results: [], isSearching: false });
      return;
    }

    const requestId = get().requestId + 1;

    set({
      requestId,
      isSearching: true,
      isLoadingMore: false,
      error: null,
    });

    try {
      const raw: YouTubeSearchResult[] =
        await tauriCommands.searchYoutube(trimmed);

      // Ignore stale searches
      if (get().requestId !== requestId) {
        return;
      }

      set({
        results: raw.map(toSong),
        isSearching: false,
        lastQuery: trimmed,
      });
    } catch (e) {
      if (get().requestId === requestId) {
        set({
          error: String(e),
          isSearching: false,
          lastQuery: trimmed,
        });
      }
    }
  },
  loadMore: async () => {
    const { lastQuery, offset, requestId } = get();
    if (!lastQuery || get().isLoadingMore) return;
    const query = lastQuery;
    const requestedOffset = offset;
    set({ isLoadingMore: true });
    try {
      const raw: YouTubeSearchResult[] = await tauriCommands.searchYoutube(
        query,
        undefined,
        requestedOffset,
      );

      if (
        get().requestId !== requestId ||
        get().lastQuery !== query ||
        get().offset !== requestedOffset
      ) {
        return;
      }

      set((state) => ({
        results: [...state.results, ...raw.map(toSong)],
        isLoadingMore: false,
        offset: requestedOffset + 15,
      }));
    } catch (e) {
      if (get().requestId === requestId && get().lastQuery === query) {
        set({ error: String(e), isLoadingMore: false });
      }
    }
  },

  clearResults: () =>
    set({ results: [], error: null, lastQuery: "", offset: 0 }),

  downloadAudio: async (
    videoId: string,
    title: string,
  ): Promise<string | null> => {
    try {
      const msg: string = await tauriCommands.downloadYoutube(videoId, title);
      return msg;
    } catch (e) {
      console.error("Download failed:", e);
      return null;
    }
  },
}));
