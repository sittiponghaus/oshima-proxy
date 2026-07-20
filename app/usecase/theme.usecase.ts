/**
 * Theme preference: toggle, document sync, map style resolution.
 */
import * as themeStore from "@/app/store/theme.store"
import type { Theme } from "@/app/store/theme.store"

export type { Theme }

/** Atom for React subscriptions (hooks only — not presentation). */
export const themeAtom = themeStore.themeAtom

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark"
}

export function applyTheme(theme: Theme): void {
  themeStore.applyThemeToDocument(theme)
}

export function mapStyleForTheme(theme: Theme): string {
  return themeStore.mapStyleForTheme(theme)
}
