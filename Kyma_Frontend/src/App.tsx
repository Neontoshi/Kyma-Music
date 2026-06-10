import { useEffect } from "react";
import AppRoutes from "./AppRoutes";
import { PlayerProvider } from "./presentation/hooks/PlayerContext";
import { useSystemStore } from "./presentation/stores/systemStore";
import { usePlayerStore } from "./presentation/stores/playerStore";
import { useQueueStore } from "./presentation/stores/queueStore";
import { useUserStore } from "./presentation/stores/userStore";
import ErrorBoundary from "./presentation/components/ErrorBoundary";
import { tauriCommands } from "./services/tauriBridge";
import "./styles/globals.css";

function App() {
  const checkYtdlp = useSystemStore((s) => s.checkYtdlp);

  const tryResume = async () => {
    try {
      const state = await tauriCommands.getResumeState();

      if (state.song && state.song.duration > 0) {
        usePlayerStore.getState().setCurrentSong(state.song);
      }
    } catch {}
  };

  // Initialize user store from localStorage on mount
  useEffect(() => {
    useUserStore.getState();
  }, []);

  useEffect(() => {
    checkYtdlp();
    tryResume();
    useQueueStore.getState()._hydrate();
  }, []);

  return (
    <ErrorBoundary>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </ErrorBoundary>
  );
}

export default App;
