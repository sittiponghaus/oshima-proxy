/**
 * Persists the user's dark/light preference to localStorage.
 *
 * Default (no saved value): follow `prefers-color-scheme`; if that API is
 * unavailable, fall back to `"dark"` (the previous always-on look).
 */
import * as Atom from "effect/unstable/reactivity/Atom"

export type Theme = "dark" | "light"

export const themeAtomKey = {
  all: () => ["theme"] as const,
  preference: () => [...themeAtomKey.all(), "preference"] as const
} as const

const ThemeLocalStorageKey = `$atom-${themeAtomKey.preference().join("-")}`

const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark"
const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"

export function mapStyleForTheme(theme: Theme): string {
  return theme === "light" ? LIGHT_MAP_STYLE : DARK_MAP_STYLE
}

/** Resolve theme: saved preference → prefers-color-scheme → dark. */
export function resolveTheme(): Theme {
  const stored = ReadStoredTheme()
  if (stored) return stored
  return prefersColorSchemeTheme() ?? "dark"
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.toggle("light", theme === "light")
  root.classList.toggle("dark", theme === "dark")
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

/**
 * Writable theme atom (query + mutation).
 * Read: resolveTheme(). Write: persist then update in-memory.
 */
export const themeAtom: Atom.Writable<Theme> = Atom.writable(
  (): Theme => resolveTheme(),
  (ctx, theme: Theme) => {
    WriteLocalStorageItem(ThemeLocalStorageKey, theme)
    ctx.setSelf(theme)
  }
).pipe(Atom.keepAlive)

function ReadStoredTheme(): Theme | null {
  const item = ReadLocalStorageItem(ThemeLocalStorageKey)
  return IsTheme(item) ? item : null
}

function IsTheme(input: string | null): input is Theme {
  return input === "dark" || input === "light"
}

function prefersColorSchemeTheme(): Theme | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

function ReadLocalStorageItem(key: string): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(key)
}

function WriteLocalStorageItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, value)
}
