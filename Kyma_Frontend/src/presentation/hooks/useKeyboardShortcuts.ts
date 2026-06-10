import { useEffect } from "react";
import { usePlayerContext } from "./PlayerContext";

export const useKeyboardShortcuts = () => {
  // Use the shared context instance — never call usePlayer() directly here.
  // Calling usePlayer() creates a second repository instance whose
  // onPlaybackUpdate call clears the primary polling interval, killing
  // progress updates and lyrics in NowPlaying.
  const { togglePlay, nextSong, prevSong, setVolume, volume } =
    usePlayerContext();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space bar - play/pause
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
      // Arrow keys with Ctrl
      else if (e.code === "ArrowRight" && e.ctrlKey) {
        e.preventDefault();
        nextSong();
      } else if (e.code === "ArrowLeft" && e.ctrlKey) {
        e.preventDefault();
        prevSong();
      }
      // Volume
      else if (e.code === "ArrowUp" && e.ctrlKey) {
        e.preventDefault();
        setVolume(Math.min(volume + 5, 100));
      } else if (e.code === "ArrowDown" && e.ctrlKey) {
        e.preventDefault();
        setVolume(Math.max(volume - 5, 0));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [togglePlay, nextSong, prevSong, setVolume, volume]);
};
