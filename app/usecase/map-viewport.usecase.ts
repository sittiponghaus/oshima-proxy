/**
 * Persisted map camera (center + zoom).
 */
import { DEFAULT_VIEW_STATE } from "@/app/config/map-viewport"
import * as mapViewportRepository from "@/app/repository/map-viewport.repository"
import type { StoredViewport } from "@/app/repository/map-viewport.repository"

export type { StoredViewport }
export { DEFAULT_VIEW_STATE }

/** Atom for React subscriptions (hooks only — not containers/components). */
export const mapViewportAtom = mapViewportRepository.mapViewportAtom

export function resolveInitialViewState(stored: StoredViewport | null): StoredViewport {
  return stored ?? DEFAULT_VIEW_STATE
}
