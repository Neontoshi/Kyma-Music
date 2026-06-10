import { create } from "zustand";
import { Song } from "../../core/entities/Song";

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

function randomGradient(): string {
  const hues = [280, 200, 340, 40, 160, 100, 10, 260];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `linear-gradient(135deg, hsl(${h}, 50%, 35%), hsl(${h + 30}, 40%, 20%))`;
}

function randomEmoji(): string {
  const emojis = ["🎵", "🎶", "🎧", "🎤", "🎼", "🎹", "🎸", "🥁", "🎺", "🎷"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function toSong(r: YouTubeSearchResult): Song {
  return {
    id: `yt-${r.id}`,
    path: "",
    title: r.title,
    artist: r.artist || "YouTube",
    album: "YouTube",
    duration: r.duration_secs,
    genre: null,
    year: null,
    track_number: null,
    artwork: null,
    source: "youtube" as const,
    videoId: r.id,
    dur: r.duration_str,
    emoji: randomEmoji(),
    grad: randomGradient(),
    bpm: 0,
    key: "—",
    plays: 0,
    liked: false,
  };
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
      error: null,
    });

    try {
      const { invoke } = await import("@tauri-apps/api/core");

      const raw: YouTubeSearchResult[] = await invoke("youtube_search", {
        query: trimmed,
      });

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
        });
      }
    }
  },
  loadMore: async () => {
    const { lastQuery, offset, results } = get();
    if (!lastQuery) return;
    set({ isLoadingMore: true });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw: YouTubeSearchResult[] = await invoke("youtube_search", {
        query: lastQuery,
        offset,
      });
      set({
        results: [...results, ...raw.map(toSong)],
        isLoadingMore: false,
        offset: offset + 15,
      });
    } catch (e) {
      set({ error: String(e), isLoadingMore: false });
    }
  },

  clearResults: () =>
    set({ results: [], error: null, lastQuery: "", offset: 0 }),

  downloadAudio: async (
    videoId: string,
    title: string,
  ): Promise<string | null> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const msg: string = await invoke("youtube_download", {
        videoId,
        title,
      });
      return msg;
    } catch (e) {
      console.error("Download failed:", e);
      return null;
    }
  },
}));
