import { mapViewportAtom, resolveInitialViewState, type StoredViewport } from "@/app/usecase/map-viewport.usecase"
/**
 * React bindings for persisted map viewport usecase.
 */
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useRef } from "react"

export type { StoredViewport }

export function useMapViewport() {
  const storedViewport = useAtomValue(mapViewportAtom)
  const setStoredViewport = useAtomSet(mapViewportAtom)
  // Snapshot once for MapLibre initialViewState — later edits go through setStoredViewport.
  const initialViewStateRef = useRef<ReturnType<typeof resolveInitialViewState> | null>(null)
  if (initialViewStateRef.current === null) {
    initialViewStateRef.current = resolveInitialViewState(storedViewport)
  }

  return { storedViewport, setStoredViewport, initialViewState: initialViewStateRef.current }
}
