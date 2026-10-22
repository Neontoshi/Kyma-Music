// Kyma_Frontend/src/presentation/stores/fontStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { tauriCommands } from "../../services/tauriBridge";

export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
  category?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: "inter",
    label: "Inter",
    fontFamily: "'Inter', sans-serif",
    category: "Modern",
  },
  {
    value: "manrope",
    label: "Manrope",
    fontFamily: "'Manrope', sans-serif",
    category: "Modern",
  },
  {
    value: "dm-sans",
    label: "DM Sans",
    fontFamily: "'DM Sans', sans-serif",
    category: "Modern",
  },
  {
    value: "space-grotesk",
    label: "Space Grotesk",
    fontFamily: "'Space Grotesk', sans-serif",
    category: "Modern",
  },
];

export const DEFAULT_FONT = "inter";

export interface FontSizeOption {
  value: string;
  label: string;
  scale: number;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { value: "small", label: "Small", scale: 0.9 },
  { value: "medium", label: "Medium", scale: 1 },
  { value: "large", label: "Large", scale: 1.1 },
  { value: "x-large", label: "Extra large", scale: 1.2 },
];

export const DEFAULT_FONT_SIZE = "medium";

interface FontStore {
  selectedFont: string;
  fontSize: string;
  isInitialized: boolean;
  setFont: (fontValue: string) => void;
  setFontSize: (size: string) => void;
  applyFont: () => void;
  loadFromBackend: () => Promise<void>;
  saveToBackend: () => Promise<void>;
}

const applyFontToDocument = (fontValue: string) => {
  const font = FONT_OPTIONS.find((f) => f.value === fontValue);
  if (font) {
    document.documentElement.style.setProperty(
      "--font-family-base",
      font.fontFamily,
    );
    document.body.style.fontFamily = font.fontFamily;
    document.documentElement.setAttribute("data-current-font", fontValue);
    console.log(`[Font] Applied: ${font.label}`);
  }
};

const applyFontSizeToDocument = async (fontSize: string) => {
  const size =
    FONT_SIZE_OPTIONS.find((option) => option.value === fontSize) ??
    FONT_SIZE_OPTIONS[1];

  document.documentElement.setAttribute("data-font-size", size.value);
  document.documentElement.style.setProperty(
    "--ui-scale",
    size.scale.toString(),
  );

  if (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  ) {
    try {
      await getCurrentWebview().setZoom(size.scale);
    } catch (error) {
      console.error("[Font] Failed to apply UI scale:", error);
    }
  }
};

export const useFontStore = create<FontStore>()(
  persist(
    (set, get) => ({
      selectedFont: DEFAULT_FONT,
      fontSize: DEFAULT_FONT_SIZE,
      isInitialized: false,

      setFont: (fontValue: string) => {
        const font = FONT_OPTIONS.find((f) => f.value === fontValue);
        if (font) {
          set({ selectedFont: fontValue });
          applyFontToDocument(fontValue);
          get().saveToBackend();
        }
      },

      setFontSize: (fontSize: string) => {
        const size = FONT_SIZE_OPTIONS.find(
          (option) => option.value === fontSize,
        );
        if (!size) return;
        set({ fontSize: size.value });
        applyFontSizeToDocument(size.value);
        get().saveToBackend();
      },

      applyFont: () => {
        applyFontToDocument(get().selectedFont);
        applyFontSizeToDocument(get().fontSize);
      },

      loadFromBackend: async () => {
        try {
          const [savedFont, savedFontSize] = await Promise.all([
            tauriCommands.getSetting("selected_font"),
            tauriCommands.getSetting("font_size"),
          ]);

          const resolvedFont =
            savedFont && FONT_OPTIONS.some((f) => f.value === savedFont)
              ? savedFont
              : DEFAULT_FONT;
          const resolvedSize =
            savedFontSize &&
            FONT_SIZE_OPTIONS.some((option) => option.value === savedFontSize)
              ? savedFontSize
              : DEFAULT_FONT_SIZE;

          set({
            selectedFont: resolvedFont,
            fontSize: resolvedSize,
            isInitialized: true,
          });
          applyFontToDocument(resolvedFont);
          applyFontSizeToDocument(resolvedSize);
        } catch (error) {
          console.error("Failed to load font from backend:", error);
          set({ isInitialized: true });
          applyFontToDocument(DEFAULT_FONT);
          applyFontSizeToDocument(DEFAULT_FONT_SIZE);
        }
      },

      saveToBackend: async () => {
        const { selectedFont, fontSize } = get();
        try {
          await Promise.all([
            tauriCommands.setSetting("selected_font", selectedFont),
            tauriCommands.setSetting("font_size", fontSize),
          ]);
        } catch (error) {
          console.error("Failed to save font settings to backend:", error);
        }
      },
    }),
    {
      name: "kyma_font_store",
      partialize: (state) => ({
        selectedFont: state.selectedFont,
        fontSize: state.fontSize,
      }),
    },
  ),
);
