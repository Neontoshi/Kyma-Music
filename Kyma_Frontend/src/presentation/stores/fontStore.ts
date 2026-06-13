// Kyma_Frontend/src/presentation/stores/fontStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriCommands } from "../../services/tauriBridge";

export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
  category?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  // System
  {
    value: "system",
    label: "System Default",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    category: "System",
  },
  {
    value: "helvetica",
    label: "Helvetica Neue",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    category: "System",
  },
  {
    value: "georgia",
    label: "Georgia",
    fontFamily: "Georgia, 'Times New Roman', serif",
    category: "System",
  },

  // Clean & Modern
  {
    value: "inter",
    label: "Inter",
    fontFamily: "'Inter', sans-serif",
    category: "Modern",
  },
  {
    value: "dm-sans",
    label: "DM Sans",
    fontFamily: "'DM Sans', sans-serif",
    category: "Modern",
  },
  {
    value: "manrope",
    label: "Manrope",
    fontFamily: "'Manrope', sans-serif",
    category: "Modern",
  },
  {
    value: "figtree",
    label: "Figtree",
    fontFamily: "'Figtree', sans-serif",
    category: "Modern",
  },
  {
    value: "outfit",
    label: "Outfit",
    fontFamily: "'Outfit', sans-serif",
    category: "Modern",
  },
  {
    value: "urbanist",
    label: "Urbanist",
    fontFamily: "'Urbanist', sans-serif",
    category: "Modern",
  },
  {
    value: "geist",
    label: "Geist",
    fontFamily: "'Geist', sans-serif",
    category: "Modern",
  },
  {
    value: "nunito",
    label: "Nunito",
    fontFamily: "'Nunito', sans-serif",
    category: "Modern",
  },
  {
    value: "quicksand",
    label: "Quicksand",
    fontFamily: "'Quicksand', sans-serif",
    category: "Modern",
  },
  {
    value: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    category: "Modern",
  },
  {
    value: "lexend",
    label: "Lexend",
    fontFamily: "'Lexend', sans-serif",
    category: "Modern",
  },
  {
    value: "sora",
    label: "Sora",
    fontFamily: "'Sora', sans-serif",
    category: "Modern",
  },
  {
    value: "space-grotesk",
    label: "Space Grotesk",
    fontFamily: "'Space Grotesk', sans-serif",
    category: "Modern",
  },
  {
    value: "instrument-sans",
    label: "Instrument Sans",
    fontFamily: "'Instrument Sans', sans-serif",
    category: "Modern",
  },
  {
    value: "noto-sans",
    label: "Noto Sans",
    fontFamily: "'Noto Sans', sans-serif",
    category: "Modern",
  },
  {
    value: "rubik",
    label: "Rubik",
    fontFamily: "'Rubik', sans-serif",
    category: "Modern",
  },
  {
    value: "karla",
    label: "Karla",
    fontFamily: "'Karla', sans-serif",
    category: "Modern",
  },
  {
    value: "mulish",
    label: "Mulish",
    fontFamily: "'Mulish', sans-serif",
    category: "Modern",
  },
  {
    value: "barlow",
    label: "Barlow",
    fontFamily: "'Barlow', sans-serif",
    category: "Modern",
  },
  {
    value: "jost",
    label: "Jost",
    fontFamily: "'Jost', sans-serif",
    category: "Modern",
  },

  //   Stylish & Editorial
  {
    value: "syne",
    label: "Syne",
    fontFamily: "'Syne', sans-serif",
    category: "Stylish",
  },
  {
    value: "poppins",
    label: "Poppins",
    fontFamily: "'Poppins', sans-serif",
    category: "Stylish",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    fontFamily: "'Montserrat', sans-serif",
    category: "Stylish",
  },
  {
    value: "raleway",
    label: "Raleway",
    fontFamily: "'Raleway', sans-serif",
    category: "Stylish",
  },
  {
    value: "josefin-sans",
    label: "Josefin Sans",
    fontFamily: "'Josefin Sans', sans-serif",
    category: "Stylish",
  },
  {
    value: "exo-2",
    label: "Exo 2",
    fontFamily: "'Exo 2', sans-serif",
    category: "Stylish",
  },
  {
    value: "oxanium",
    label: "Oxanium",
    fontFamily: "'Oxanium', sans-serif",
    category: "Stylish",
  },
  {
    value: "orbitron",
    label: "Orbitron",
    fontFamily: "'Orbitron', sans-serif",
    category: "Stylish",
  },
  {
    value: "russo-one",
    label: "Russo One",
    fontFamily: "'Russo One', sans-serif",
    category: "Stylish",
  },
  {
    value: "syncopate",
    label: "Syncopate",
    fontFamily: "'Syncopate', sans-serif",
    category: "Stylish",
  },
  {
    value: "rajdhani",
    label: "Rajdhani",
    fontFamily: "'Rajdhani', sans-serif",
    category: "Stylish",
  },
  {
    value: "chakra-petch",
    label: "Chakra Petch",
    fontFamily: "'Chakra Petch', sans-serif",
    category: "Stylish",
  },
  {
    value: "teko",
    label: "Teko",
    fontFamily: "'Teko', sans-serif",
    category: "Stylish",
  },
  {
    value: "bebas-neue",
    label: "Bebas Neue",
    fontFamily: "'Bebas Neue', sans-serif",
    category: "Stylish",
  },
  {
    value: "black-ops-one",
    label: "Black Ops One",
    fontFamily: "'Black Ops One', sans-serif",
    category: "Stylish",
  },
  {
    value: "bungee",
    label: "Bungee",
    fontFamily: "'Bungee', sans-serif",
    category: "Stylish",
  },
  {
    value: "righteous",
    label: "Righteous",
    fontFamily: "'Righteous', sans-serif",
    category: "Stylish",
  },

  // Elegant & Classy
  {
    value: "playfair",
    label: "Playfair Display",
    fontFamily: "'Playfair Display', serif",
    category: "Elegant",
  },
  {
    value: "cormorant",
    label: "Cormorant Garamond",
    fontFamily: "'Cormorant Garamond', serif",
    category: "Elegant",
  },
  {
    value: "libre-baskerville",
    label: "Libre Baskerville",
    fontFamily: "'Libre Baskerville', serif",
    category: "Elegant",
  },
  {
    value: "source-serif",
    label: "Source Serif 4",
    fontFamily: "'Source Serif 4', serif",
    category: "Elegant",
  },
  {
    value: "dm-serif",
    label: "DM Serif Display",
    fontFamily: "'DM Serif Display', serif",
    category: "Elegant",
  },
  {
    value: "lora",
    label: "Lora",
    fontFamily: "'Lora', serif",
    category: "Elegant",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    fontFamily: "'Merriweather', serif",
    category: "Elegant",
  },
  {
    value: "eb-garamond",
    label: "EB Garamond",
    fontFamily: "'EB Garamond', serif",
    category: "Elegant",
  },
  {
    value: "gfs-didot",
    label: "GFS Didot",
    fontFamily: "'GFS Didot', serif",
    category: "Elegant",
  },
  {
    value: "bodoni-moda",
    label: "Bodoni Moda",
    fontFamily: "'Bodoni Moda', serif",
    category: "Elegant",
  },
  {
    value: "crimson-pro",
    label: "Crimson Pro",
    fontFamily: "'Crimson Pro', serif",
    category: "Elegant",
  },
  {
    value: "forum",
    label: "Forum",
    fontFamily: "'Forum', serif",
    category: "Elegant",
  },
  {
    value: "spectral",
    label: "Spectral",
    fontFamily: "'Spectral', serif",
    category: "Elegant",
  },

  // Handwriting & Script
  {
    value: "dancing-script",
    label: "Dancing Script",
    fontFamily: "'Dancing Script', cursive",
    category: "Script",
  },
  {
    value: "pacifico",
    label: "Pacifico",
    fontFamily: "'Pacifico', cursive",
    category: "Script",
  },
  {
    value: "caveat",
    label: "Caveat",
    fontFamily: "'Caveat', cursive",
    category: "Script",
  },
  {
    value: "satisfy",
    label: "Satisfy",
    fontFamily: "'Satisfy', cursive",
    category: "Script",
  },
  {
    value: "great-vibes",
    label: "Great Vibes",
    fontFamily: "'Great Vibes', cursive",
    category: "Script",
  },
  {
    value: "yellowtail",
    label: "Yellowtail",
    fontFamily: "'Yellowtail', cursive",
    category: "Script",
  },
  {
    value: "sacramento",
    label: "Sacramento",
    fontFamily: "'Sacramento', cursive",
    category: "Script",
  },
  {
    value: "pinyon-script",
    label: "Pinyon Script",
    fontFamily: "'Pinyon Script', cursive",
    category: "Script",
  },
  {
    value: "rouge-script",
    label: "Rouge Script",
    fontFamily: "'Rouge Script', cursive",
    category: "Script",
  },

  // Fun & Playful
  {
    value: "fredoka",
    label: "Fredoka",
    fontFamily: "'Fredoka', sans-serif",
    category: "Fun",
  },
  {
    value: "baloo-2",
    label: "Baloo 2",
    fontFamily: "'Baloo 2', sans-serif",
    category: "Fun",
  },
  {
    value: "comic-neue",
    label: "Comic Neue",
    fontFamily: "'Comic Neue', cursive",
    category: "Fun",
  },
  {
    value: "lilita-one",
    label: "Lilita One",
    fontFamily: "'Lilita One', sans-serif",
    category: "Fun",
  },
  {
    value: "titan-one",
    label: "Titan One",
    fontFamily: "'Titan One', sans-serif",
    category: "Fun",
  },
  {
    value: "chewy",
    label: "Chewy",
    fontFamily: "'Chewy', cursive",
    category: "Fun",
  },
  {
    value: "boogaloo",
    label: "Boogaloo",
    fontFamily: "'Boogaloo', cursive",
    category: "Fun",
  },
  {
    value: "lobster",
    label: "Lobster",
    fontFamily: "'Lobster', cursive",
    category: "Fun",
  },
  {
    value: "permanent-marker",
    label: "Permanent Marker",
    fontFamily: "'Permanent Marker', cursive",
    category: "Fun",
  },
  {
    value: "bangers",
    label: "Bangers",
    fontFamily: "'Bangers', cursive",
    category: "Fun",
  },

  // Monospace / Code
  {
    value: "jetbrains-mono",
    label: "JetBrains Mono",
    fontFamily: "'JetBrains Mono', monospace",
    category: "Mono",
  },
  {
    value: "fira-code",
    label: "Fira Code",
    fontFamily: "'Fira Code', monospace",
    category: "Mono",
  },
  {
    value: "source-code",
    label: "Source Code Pro",
    fontFamily: "'Source Code Pro', monospace",
    category: "Mono",
  },
  {
    value: "space-mono",
    label: "Space Mono",
    fontFamily: "'Space Mono', monospace",
    category: "Mono",
  },
  {
    value: "ibm-plex-mono",
    label: "IBM Plex Mono",
    fontFamily: "'IBM Plex Mono', monospace",
    category: "Mono",
  },
  {
    value: "dm-mono",
    label: "DM Mono",
    fontFamily: "'DM Mono', monospace",
    category: "Mono",
  },
  {
    value: "roboto-mono",
    label: "Roboto Mono",
    fontFamily: "'Roboto Mono', monospace",
    category: "Mono",
  },
  {
    value: "courier-prime",
    label: "Courier Prime",
    fontFamily: "'Courier Prime', monospace",
    category: "Mono",
  },

  // Crazy / Experimental
  {
    value: "vt323",
    label: "VT323 (Retro Terminal)",
    fontFamily: "'VT323', monospace",
    category: "Crazy",
  },
  {
    value: "press-start",
    label: "Press Start 2P (8-bit)",
    fontFamily: "'Press Start 2P', monospace",
    category: "Crazy",
  },
  {
    value: "creepster",
    label: "Creepster (Horror)",
    fontFamily: "'Creepster', cursive",
    category: "Crazy",
  },
  {
    value: "nosifer",
    label: "Nosifer (Drip)",
    fontFamily: "'Nosifer', cursive",
    category: "Crazy",
  },
  {
    value: "metal-mania",
    label: "Metal Mania",
    fontFamily: "'Metal Mania', cursive",
    category: "Crazy",
  },
  {
    value: "special-elite",
    label: "Special Elite (Typewriter)",
    fontFamily: "'Special Elite', cursive",
    category: "Crazy",
  },
  {
    value: "silkscreen",
    label: "Silkscreen (Pixel)",
    fontFamily: "'Silkscreen', sans-serif",
    category: "Crazy",
  },
  {
    value: "audiowide",
    label: "Audiowide (Sci-Fi)",
    fontFamily: "'Audiowide', sans-serif",
    category: "Crazy",
  },
  {
    value: "megrim",
    label: "Megrim (Geometric)",
    fontFamily: "'Megrim', cursive",
    category: "Crazy",
  },
  {
    value: "kumar-one-outline",
    label: "Kumar One Outline",
    fontFamily: "'Kumar One Outline', cursive",
    category: "Crazy",
  },
  {
    value: "bungee-shade",
    label: "Bungee Shade (3D)",
    fontFamily: "'Bungee Shade', cursive",
    category: "Crazy",
  },
  {
    value: "tourney",
    label: "Tourney (Variable)",
    fontFamily: "'Tourney', cursive",
    category: "Crazy",
  },
  {
    value: "rampart-one",
    label: "Rampart One (Hollow)",
    fontFamily: "'Rampart One', cursive",
    category: "Crazy",
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
          get().saveToBackend();
        }
      },

      applyFont: () => {
        applyFontToDocument(get().selectedFont);
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
      name: "kyma_font_store",
      partialize: (state) => ({ selectedFont: state.selectedFont }),
    },
  ),
);
