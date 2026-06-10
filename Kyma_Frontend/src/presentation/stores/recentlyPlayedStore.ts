import { create } from "zustand";
import { tauriCommands } from "../../services/tauriBridge";

interface RecentlyPlayedState {
  items: any[];
  loading: boolean;
  loaded: boolean;
  loadRecentPlays: () => Promise<void>;
}

export const useRecentlyPlayedStore = create<RecentlyPlayedState>(
  (set, get) => ({
    items: [],
    loading: false,
    loaded: false,

    loadRecentPlays: async () => {
      if (get().loading) return;
      set({ loading: true });

      try {
        const data = await tauriCommands.getRecentlyPlayed(10);
        const items = (data as any[]) || [];
        set({ items, loading: false, loaded: true });
      } catch {
        set({ loading: false });
      }
    },
  }),
);
