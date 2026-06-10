// Kyma_Frontend/src/presentation/stores/systemStore.ts
import { create } from "zustand";
import { tauriCommands } from "../../services/tauriBridge";

interface SystemStore {
  ytdlpAvailable: boolean;
  ytdlpVersion: string | null;
  ytdlpChecked: boolean;
  checkYtdlp: () => Promise<void>;
}

export const useSystemStore = create<SystemStore>((set) => ({
  ytdlpAvailable: false,
  ytdlpVersion: null,
  ytdlpChecked: false,
  checkYtdlp: async () => {
    try {
      const version = await tauriCommands.checkYtdlp();
      set({ ytdlpAvailable: true, ytdlpVersion: version, ytdlpChecked: true });
    } catch {
      set({ ytdlpAvailable: false, ytdlpVersion: null, ytdlpChecked: true });
    }
  },
}));
