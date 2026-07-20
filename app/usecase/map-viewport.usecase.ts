/**
 * Persisted map camera (center + zoom).
 */
import { DEFAULT_VIEW_STATE } from "@/app/config/map-viewport"
import * as mapViewportStore from "@/app/store/map-viewport.store"
import type { StoredViewport } from "@/app/store/map-viewport.store"

export type { StoredViewport }
export { DEFAULT_VIEW_STATE }

/** Atom for React subscriptions (hooks only — not containers/components). */
export const mapViewportAtom = mapViewportStore.mapViewportAtom

export function resolveInitialViewState(stored: StoredViewport | null): StoredViewport {
  return stored ?? DEFAULT_VIEW_STATE
}
