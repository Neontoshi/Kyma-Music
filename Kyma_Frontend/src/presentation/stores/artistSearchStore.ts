import { create } from "zustand";
import { tauriCommands } from "../../services/tauriBridge";

const YT_SEARCH_QUERIES = [
  (artist: string) => artist,
  (artist: string) => `${artist} music`,
  (artist: string) => `${artist} official`,
  (artist: string) => `${artist} audio`,
  (artist: string) => `${artist} vevo`,
  (artist: string) => `${artist} feat`,
  (artist: string) => `${artist} featuring`,
  (artist: string) => `${artist} ft`,
];

const CACHE_KEY = (artist: string) => `kyma_artist_songs_${artist}`;
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

interface ArtistSearchState {
  activeSearches: Map<string, AbortController>;
  searchArtist: (artist: string) => void;
  cancelSearch: (artist: string) => void;
  isSearching: (artist: string) => boolean;
}

function loadCache(artist: string): any[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(artist));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.lastFetched < CACHE_TTL) {
      return data.songs;
    }
  } catch {}
  return null;
}

function saveCache(artist: string, songs: any[]) {
  try {
    localStorage.setItem(
      CACHE_KEY(artist),
      JSON.stringify({ songs, lastFetched: Date.now() }),
    );
  } catch {}
}

async function searchArtistSongs(
  artist: string,
  signal: AbortSignal,
): Promise<any[]> {
  const seenIds = new Set<string>();
  const seenTitleKeys = new Set<string>();
  const allSongs: any[] = [];

  // Run all 8 queries in parallel
  if (signal.aborted) return allSongs;

  try {
    const results = await Promise.all(
      YT_SEARCH_QUERIES.map((queryFn) =>
        tauriCommands.searchYoutube(queryFn(artist)).catch(() => []),
      ),
    );

    if (signal.aborted) return allSongs;

    for (const ytResults of results) {
      const newSongs = (ytResults || []).filter((r: any) => {
        const id = `yt-${r.id}`;
        const cleanTitle = r.title
          ?.toLowerCase()
          .trim()
          .replace(/\s*\(.*?\)\s*/g, "")
          .replace(/\s*\[.*?\]\s*/g, "")
          .replace(/\s*\|.*$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const cleanArtist = r.artist
          ?.toLowerCase()
          .trim()
          .replace(/\s*-\s*topic\s*$/i, "")
          .replace(/\s*vevo\s*$/i, "")
          .replace(/\s*official\s*$/i, "")
          .trim();
        const titleKey = `${cleanTitle}|${cleanArtist}`;
        if (seenIds.has(id) || seenTitleKeys.has(titleKey)) return false;
        const dur = r.duration_secs;
        if (!dur || dur < 60 || dur > 600) return false;
        seenIds.add(id);
        seenTitleKeys.add(titleKey);
        return true;
      });

      allSongs.push(
        ...newSongs.map((r: any) => ({
          id: `yt-${r.id}`,
          path: "",
          title: r.title,
          artist: r.artist,
          album: "YouTube",
          duration: r.duration_secs,
          genre: null,
          year: null,
          track_number: null,
          artwork: r.thumbnail,
          source: "youtube",
          videoId: r.id,
          dur: r.duration_str,
          emoji: "▶️",
          grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
          bpm: 0,
          key: "—",
          plays: 0,
          liked: false,
        })),
      );
    }
  } catch (err) {
    console.error("Artist search failed:", err);
  }

  return allSongs;
}

export const useArtistSearchStore = create<ArtistSearchState>((set, get) => ({
  activeSearches: new Map(),

  searchArtist: async (artist: string) => {
    const existing = get().activeSearches.get(artist);
    if (existing) existing.abort();

    const controller = new AbortController();
    const newSearches = new Map(get().activeSearches);
    newSearches.set(artist, controller);
    set({ activeSearches: newSearches });

    const cached = loadCache(artist);
    if (cached) {
      newSearches.delete(artist);
      set({ activeSearches: new Map(newSearches) });
      return;
    }

    try {
      const songs = await searchArtistSongs(artist, controller.signal);
      if (!controller.signal.aborted) {
        saveCache(artist, songs);
      }
    } catch (err) {
      console.error("Artist search failed:", err);
    } finally {
      const searches = new Map(get().activeSearches);
      searches.delete(artist);
      set({ activeSearches: searches });
    }
  },

  cancelSearch: (artist: string) => {
    const controller = get().activeSearches.get(artist);
    if (controller) {
      controller.abort();
      const newSearches = new Map(get().activeSearches);
      newSearches.delete(artist);
      set({ activeSearches: newSearches });
    }
  },

  isSearching: (artist: string) => {
    return get().activeSearches.has(artist);
  },
}));
