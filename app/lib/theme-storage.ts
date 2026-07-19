/**
 * Persists the user's dark/light preference to localStorage.
 * Key mirrors `oshima-proxy:map-viewport` / geolocation helpers.
 *
 * Default (no saved value): follow `prefers-color-scheme`; if that API is
 * unavailable, fall back to `"dark"` (the previous always-on look).
 */

export type Theme = "dark" | "light";

const ThemeLocalStorageKey = "oshima-proxy:theme";

const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function mapStyleForTheme(theme: Theme): string {
  return theme === "light" ? LIGHT_MAP_STYLE : DARK_MAP_STYLE;
}

/** Resolve theme: saved preference → prefers-color-scheme → dark. */
export function resolveTheme(): Theme {
  const stored = readStoredTheme();
  if (stored) return stored;
  return prefersColorSchemeTheme() ?? "dark";
}

export function readStoredTheme(): Theme | null {
  const item = ReadLocalStorageItem(ThemeLocalStorageKey);
  if (item === "dark" || item === "light") return item;
  return null;
}

export function writeStoredTheme(theme: Theme): void {
  WriteLocalStorageItem(ThemeLocalStorageKey, theme);
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function prefersColorSchemeTheme(): Theme | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function ReadLocalStorageItem(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

function WriteLocalStorageItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, value);
}
