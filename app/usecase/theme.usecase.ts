/**
 * Theme preference: toggle, document sync, map style resolution.
 */
import * as themeRepository from "@/app/repository/theme.repository"
import type { Theme } from "@/app/repository/theme.repository"

export type { Theme }

/** Atom for React subscriptions (hooks only — not presentation). */
export const themeAtom = themeRepository.themeAtom

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark"
}

export function applyTheme(theme: Theme): void {
  themeRepository.applyThemeToDocument(theme)
}

export function mapStyleForTheme(theme: Theme): string {
  return themeRepository.mapStyleForTheme(theme)
}
