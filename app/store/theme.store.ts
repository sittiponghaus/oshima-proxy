/**
 * Persists the user's dark/light preference via Effect `Atom.kvs` +
 * `BrowserKeyValueStore.layerLocalStorage`.
 *
 * Default (no saved value): follow `prefers-color-scheme`; if that API is
 * unavailable, fall back to `"dark"` (the previous always-on look).
 */
import { browserAtomRuntime } from "@/app/store/browser-atom.runtime"
import { Schema } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"

export type Theme = "dark" | "light"

export const themeAtomKey = {
  all: () => ["theme"] as const,
  preference: () => [...themeAtomKey.all(), "preference"] as const
} as const

const ThemeLocalStorageKey = `$atom-${themeAtomKey.preference().join("-")}`

const ThemeSchema = Schema.Literals(["dark", "light"])

const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark"
const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty"

export function mapStyleForTheme(theme: Theme): string {
  return theme === "light" ? LIGHT_MAP_STYLE : DARK_MAP_STYLE
}

/** Resolve theme: prefers-color-scheme → dark (used as Atom.kvs default). */
export function resolveTheme(): Theme {
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
 * Backed by `KeyValueStore` via `Atom.kvs`.
 */
export const themeAtom: Atom.Writable<Theme> = Atom.kvs({
  runtime: browserAtomRuntime,
  key: ThemeLocalStorageKey,
  schema: ThemeSchema,
  defaultValue: resolveTheme
}).pipe(Atom.keepAlive)

function prefersColorSchemeTheme(): Theme | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}
