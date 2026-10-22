// themeDefs.ts
export interface ThemeDef {
  id: string;
  name: string;
  mode: "dark" | "light";
  colors: Record<string, string>;
  style?: Record<string, string>;
}

const baseColors = {
  "--bg": "#080808",
  "--surface": "#111111",
  "--surface2": "#1a1a1a",
  "--surface3": "#262626",
  "--border": "rgba(255,255,255,0.07)",
  "--border2": "rgba(255,255,255,0.14)",
  "--text": "#ffffff",
  "--text2": "#b3b3b3",
  "--text3": "#6f6f6f",
  "--amber": "#ffffff",
};

export const themes: ThemeDef[] = [
  {
    id: "kyma-green",
    name: "Kyma Green",
    mode: "dark",
    colors: {
      ...baseColors,
      "--accent": "#9dff3a",
      "--accent2": "#b8ff66",
      "--accent3": "#1ed760",
      "--accent-rgb": "157, 255, 58",
      "--accent2-rgb": "184, 255, 102",
      "--accent3-rgb": "30, 215, 96",
      "--green": "#1ed760",
      "--red": "#ff4d4d",
    },
  },
  {
    id: "kyma-blue",
    name: "Kyma Blue",
    mode: "dark",
    colors: {
      ...baseColors,
      "--accent": "#4da3ff",
      "--accent2": "#7cc4ff",
      "--accent3": "#2f7dd1",
      "--accent-rgb": "77, 163, 255",
      "--accent2-rgb": "124, 196, 255",
      "--accent3-rgb": "47, 125, 209",
      "--green": "#4da3ff",
      "--red": "#ff4d4d",
    },
  },
  {
    id: "kyma-red",
    name: "Kyma Red",
    mode: "dark",
    colors: {
      ...baseColors,
      "--accent": "#ff4d4d",
      "--accent2": "#ff8080",
      "--accent3": "#d12f2f",
      "--accent-rgb": "255, 77, 77",
      "--accent2-rgb": "255, 128, 128",
      "--accent3-rgb": "209, 47, 47",
      "--green": "#ff4d4d",
      "--red": "#ff4d4d",
    },
  },
];

export const defaultTheme = themes[0];
