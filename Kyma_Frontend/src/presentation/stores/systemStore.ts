// Kyma_Frontend/src/presentation/stores/systemStore.ts
import { create } from "zustand";
import { tauriCommands } from "../../services/tauriBridge";

interface SystemStore {
  ytdlpAvailable: boolean;
  ytdlpVersion: string | null;
  ytdlpChecked: boolean;
  ytdlpOutdated: boolean;
  checkYtdlp: () => Promise<void>;
  updateYtdlp: () => Promise<void>;
}

export const useSystemStore = create<SystemStore>((set) => ({
  ytdlpAvailable: false,
  ytdlpVersion: null,
  ytdlpChecked: false,
  ytdlpOutdated: false,

  checkYtdlp: async () => {
    try {
      const version = await tauriCommands.checkYtdlp();
      const [year, month] = version.split(".").map(Number);
      let outdated = false;

      if (year && month) {
        const versionDate = new Date(year, month - 1);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        outdated = versionDate < sixMonthsAgo;
      }

      set({
        ytdlpAvailable: true,
        ytdlpVersion: version,
        ytdlpChecked: true,
        ytdlpOutdated: outdated,
      });
    } catch {
      set({
        ytdlpAvailable: false,
        ytdlpVersion: null,
        ytdlpChecked: true,
        ytdlpOutdated: false,
      });
    }
  },

  updateYtdlp: async () => {
    try {
      const newVersion = await tauriCommands.updateYtdlp();
      set({ ytdlpVersion: newVersion, ytdlpOutdated: false });
    } catch (e) {
      console.error("Failed to update yt-dlp:", e);
    }
  },
}));
