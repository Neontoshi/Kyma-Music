import { create } from "zustand";
import { Song, PlaybackState } from "../../core/entities/Song";

interface PlayerStore extends PlaybackState {
  duration: number;
  setDuration: (duration: number) => void;
  setCurrentSong: (song: Song) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextSong: () => void;
  prevSong: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  message: string | null;
  setMessage: (message: string | null) => void;
  buffered: number;
  setBuffered: (v: number) => void;
}
export const usePlayerStore = create<PlayerStore>((set) => ({
  currentSong: null,
  isPlaying: false,
  currentProgress: 0,
  duration: 0,
  volume: 100,
  isMuted: false,
  isShuffle: false,
  repeatMode: 0,
  isLoading: false,
  error: null,
  message: null,
  buffered: 0,

  setIsLoading: (loading) => {
    console.log("STORE isLoading:", loading);
    set({ isLoading: loading });
  },

  setError: (error) => set({ error }),

  setMessage: (message) => set({ message }),

  setBuffered: (v: number) => set({ buffered: v }),

  setCurrentSong: (song) =>
    set({
      currentSong: song,
      isPlaying: true,
      currentProgress: 0,
      buffered: 0,
    }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setDuration: (duration) => set({ duration }),

  setProgress: (progress) => set({ currentProgress: progress }),

  setVolume: (volume) => set({ volume, isMuted: false }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () =>
    set((state) => ({
      repeatMode: ((state.repeatMode + 1) % 3) as 0 | 1 | 2,
    })),

  nextSong: () => {},
  prevSong: () => {},
}));
