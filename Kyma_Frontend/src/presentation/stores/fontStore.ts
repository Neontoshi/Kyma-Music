// Kyma_Frontend/src/presentation/stores/fontStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriCommands } from "../../services/tauriBridge";

// Font options
export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: "system",
    label: "System Default",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  { value: "inter", label: "Inter", fontFamily: "'Inter', sans-serif" },
  { value: "poppins", label: "Poppins", fontFamily: "'Poppins', sans-serif" },
  {
    value: "montserrat",
    label: "Montserrat",
    fontFamily: "'Montserrat', sans-serif",
  },
  { value: "dm-sans", label: "DM Sans", fontFamily: "'DM Sans', sans-serif" },
  { value: "syne", label: "Syne", fontFamily: "'Syne', sans-serif" },
  { value: "manrope", label: "Manrope", fontFamily: "'Manrope', sans-serif" },
  { value: "geist", label: "Geist", fontFamily: "'Geist', sans-serif" },
  {
    value: "instrument-sans",
    label: "Instrument Sans",
    fontFamily: "'Instrument Sans', sans-serif",
  },
];

export const DEFAULT_FONT = "syne";

interface FontStore {
  selectedFont: string;
  isInitialized: boolean;
  setFont: (fontValue: string) => void;
  applyFont: () => void;
  loadFromBackend: () => Promise<void>;
  saveToBackend: () => Promise<void>;
}

// Helper function to apply font to document
const applyFontToDocument = (fontValue: string) => {
  const font = FONT_OPTIONS.find((f) => f.value === fontValue);
  if (font) {
    document.documentElement.style.setProperty(
      "--font-family-base",
      font.fontFamily,
    );
    // Also store the current font value as a data attribute for debugging
    document.documentElement.setAttribute("data-current-font", fontValue);
  }
};

export const useFontStore = create<FontStore>()(
  persist(
    (set, get) => ({
      selectedFont: DEFAULT_FONT,
      isInitialized: false,

      setFont: (fontValue: string) => {
        const font = FONT_OPTIONS.find((f) => f.value === fontValue);
        if (font) {
          set({ selectedFont: fontValue });
          applyFontToDocument(fontValue);
          // Save to backend after setting
          get().saveToBackend();
        }
      },

      applyFont: () => {
        const { selectedFont } = get();
        applyFontToDocument(selectedFont);
      },

      loadFromBackend: async () => {
        try {
          const savedFont = await tauriCommands.getSetting("selected_font");
          if (savedFont && FONT_OPTIONS.some((f) => f.value === savedFont)) {
            set({ selectedFont: savedFont, isInitialized: true });
            applyFontToDocument(savedFont);
          } else {
            set({ isInitialized: true });
            applyFontToDocument(DEFAULT_FONT);
          }
        } catch (error) {
          console.error("Failed to load font from backend:", error);
          set({ isInitialized: true });
          applyFontToDocument(DEFAULT_FONT);
        }
      },

      saveToBackend: async () => {
        const { selectedFont } = get();
        try {
          await tauriCommands.setSetting("selected_font", selectedFont);
        } catch (error) {
          console.error("Failed to save font to backend:", error);
        }
      },
    }),
    {
      name: "kyma_font_store", // localStorage key
      partialize: (state) => ({ selectedFont: state.selectedFont }), // only persist selectedFont
    },
  ),
);
