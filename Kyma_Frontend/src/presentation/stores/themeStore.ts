// themeStore.ts
import { create } from "zustand";
import { themes, defaultTheme, type ThemeDef } from "./themeDefs";

export type Theme = string;

interface ThemeStore {
  theme: Theme;
  setTheme: (themeId: Theme) => void;
  toggleTheme: () => void;
  getThemeDef: () => ThemeDef;
}

function applyTheme(themeId: string) {
  const def = themes.find((t) => t.id === themeId) || defaultTheme;
  document.documentElement.setAttribute("data-theme", themeId);

  // Apply colors
  for (const [key, value] of Object.entries(def.colors)) {
    document.documentElement.style.setProperty(key, value);
  }

  // Apply style tokens if present
  if (def.style) {
    for (const [key, value] of Object.entries(def.style)) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: localStorage.getItem("kyma_theme") || defaultTheme.id,

  setTheme: (themeId: Theme) => {
    localStorage.setItem("kyma_theme", themeId);
    applyTheme(themeId);
    set({ theme: themeId });
  },

  toggleTheme: () => {
    const current = get().theme;
    const currentDef = themes.find((t) => t.id === current);
    const oppositeMode = currentDef?.mode === "dark" ? "light" : "dark";
    const next = themes.find((t) => t.mode === oppositeMode) || defaultTheme;
    get().setTheme(next.id);
  },

  getThemeDef: () => {
    return themes.find((t) => t.id === get().theme) || defaultTheme;
  },
}));

// Apply on first load
const _applyInitialTheme = () => {
  applyTheme(localStorage.getItem("kyma_theme") || defaultTheme.id);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _applyInitialTheme);
} else {
  _applyInitialTheme();
}
