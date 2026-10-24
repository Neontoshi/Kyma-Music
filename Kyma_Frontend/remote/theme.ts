import {
  themes,
  defaultTheme,
  type ThemeDef,
} from "../src/presentation/stores/themeDefs";

export function getRemoteTheme(themeId?: string): ThemeDef {
  return themes.find((theme) => theme.id === themeId) || defaultTheme;
}

export function applyRemoteTheme(themeId?: string): ThemeDef {
  const def = getRemoteTheme(themeId);

  document.documentElement.setAttribute("data-theme", def.id);
  for (const [key, value] of Object.entries(def.colors)) {
    document.documentElement.style.setProperty(key, value);
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", def.colors["--bg"]);

  return def;
}
