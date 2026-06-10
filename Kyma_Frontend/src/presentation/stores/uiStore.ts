import { create } from "zustand";

export type CurrentView =
  | "home"
  | "nowplaying"
  | "songs"
  | "albums"
  | "artists"
  | "liked"
  | "explore"
  | "trending"
  | "radio";

interface UIStore {
  isEQPanelOpen: boolean;
  currentView: CurrentView;
  sidebarCollapsed: boolean;
  libraryView: "list" | "grid";
  searchQuery: string;
  toggleEQPanel: () => void;
  setCurrentView: (view: CurrentView) => void;
  toggleSidebar: () => void;
  setLibraryView: (view: "list" | "grid") => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isEQPanelOpen: false,
  currentView: "home",
  sidebarCollapsed: false,
  libraryView: "list",
  searchQuery: "",

  toggleEQPanel: () =>
    set((state) => ({ isEQPanelOpen: !state.isEQPanelOpen })),

  setCurrentView: (view) => set({ currentView: view }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setLibraryView: (view) => set({ libraryView: view }),

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
