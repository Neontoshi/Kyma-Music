import { create } from "zustand";
import { Song } from "../../core/entities/Song";
import { useYouTubeStore } from "./youtubeStore";
import { tauriCommands } from "../../services/tauriBridge";

interface LibraryStore {
  songs: Song[];
  filteredSongs: Song[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeGenre: string;
  activeSort: string;
  triggerReload: number;
  setSongs: (songs: Song[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveGenre: (genre: string) => void;
  setActiveSort: (sort: string) => void;
  toggleLike: (songId: string, songData?: Song) => Promise<boolean>;
  setTriggerReload: () => void;
  filterAndSort: () => void;
  updateSong: (updatedSong: Song) => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  filteredSongs: [],
  loading: true,
  error: null,
  searchQuery: "",
  activeGenre: "All",
  activeSort: "default",
  triggerReload: 0,

  updateSong: (updatedSong: Song) => {
    set((state) => ({
      songs: state.songs.map((s) =>
        s.id === updatedSong.id ? updatedSong : s,
      ),
    }));
    get().filterAndSort();
  },

  setSongs: (songs) => set({ songs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveGenre: (activeGenre) => set({ activeGenre }),
  setActiveSort: (activeSort) => set({ activeSort }),
  setTriggerReload: () => set((s) => ({ triggerReload: s.triggerReload + 1 })),

  toggleLike: async (songId, songData) => {
    const existingSong = get().songs.find((s) => s.id === songId);
    const previousLiked = existingSong?.liked;
    const wasPresent = Boolean(existingSong);

    set((state) => {
      const exists = state.songs.find((s) => s.id === songId);

      if (!exists && songData) {
        return { songs: [...state.songs, { ...songData, liked: true }] };
      }

      if (!exists) {
        const ytStore = useYouTubeStore.getState();
        const ytSong = ytStore.results.find((s: Song) => s.id === songId);
        if (ytSong) {
          return { songs: [...state.songs, { ...ytSong, liked: true }] };
        }
        return state;
      }

      return {
        songs: state.songs.map((song) =>
          song.id === songId ? { ...song, liked: !song.liked } : song,
        ),
      };
    });

    get().filterAndSort();

    const song =
      existingSong ??
      songData ??
      useYouTubeStore.getState().results.find((s: Song) => s.id === songId);
    const resolvedLiked =
      get().songs.find((s) => s.id === songId)?.liked ?? !existingSong?.liked;

    try {
      if (song?.source === "soundcloud") {
        await tauriCommands.toggleLikeSoundcloud({
          trackId: songId,
          title: song.title,
          artist: song.artist,
          album: song.album || "",
          durationSecs: song.duration || 0,
          thumbnail: song.artwork || "",
          videoId: song.videoId || null,
          path: song.path || "",
        });
      } else {
        const resolvedSource =
          song?.source ||
          (songId.startsWith("yt-")
            ? "youtube"
            : songId.startsWith("sc-")
              ? "soundcloud"
              : "local");

        const input = song
          ? {
              trackId: songId,
              title: song.title,
              artist: song.artist,
              album: song.album || "",
              durationSecs: song.duration || 0,
              thumbnail: song.artwork || "",
              videoId: song.videoId || null,
              source: resolvedSource,
              path: song.path || "",
            }
          : { trackId: songId };

        await tauriCommands.toggleLike(input);
      }

      return resolvedLiked;
    } catch (err) {
      set((state) => {
        if (wasPresent) {
          return {
            songs: state.songs.map((s) =>
              s.id === songId ? { ...s, liked: previousLiked ?? false } : s,
            ),
          };
        }

        return {
          songs: state.songs.filter(
            (s) => !(s.id === songId && s.liked === resolvedLiked),
          ),
        };
      });
      get().filterAndSort();
      throw err;
    }
  },

  filterAndSort: () => {
    const { songs, searchQuery, activeGenre, activeSort } = get();
    let result = [...songs].filter(
      (s) => s.source !== "youtube" && s.source !== "soundcloud",
    );
    console.log(
      "filterAndSort: songs=",
      songs.length,
      "filtered=",
      result.length,
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q),
      );
    }

    if (activeGenre && activeGenre !== "All") {
      result = result.filter((s) => s.genre === activeGenre);
    }

    switch (activeSort) {
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "artist":
        result.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case "album":
        result.sort((a, b) => a.album.localeCompare(b.album));
        break;
      case "duration":
        result.sort((a, b) => a.duration - b.duration);
        break;
      case "plays":
        result.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
        break;
    }

    set({ filteredSongs: result });
  },
}));
