// Kyma_Frontend/src/presentation/hooks/PlayerContext.tsx
import React, { createContext, useContext } from "react";
import { usePlayer } from "./usePlayer";

type PlayerContextType = ReturnType<typeof usePlayer>;
const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = usePlayer();
  return (
    <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>
  );
}

export function usePlayerContext(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    console.warn(
      "[PlayerContext] usePlayerContext used outside PlayerProvider. " +
        "Returning fallback values.",
    );

    // 🔥 FIX: async functions must return Promise<void>
    const noop = () => {};
    const noopAsync = async () => {};

    return {
      currentSong: null,
      isPlaying: false,
      currentProgress: 0,
      volume: 0,
      isShuffle: false,
      repeatMode: 0 as const,
      isLoading: false,
      togglePlay: noopAsync,
      setProgress: async (_position: number) => {},
      setVolume: noop,
      toggleMute: noop,
      toggleShuffle: noop,
      toggleRepeat: noop,
      nextSong: noop,
      prevSong: noop,
    };
  }
  return ctx;
}
