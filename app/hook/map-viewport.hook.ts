import {
  mapViewportAtom,
  resolveInitialViewState,
  type StoredViewport
} from "@/app/usecase/map-viewport.usecase"
import type { MapShareSearch } from "@/app/usecase/map-share-search.usecase"
import { resolveShareViewState } from "@/app/usecase/map-share-search.usecase"
/**
 * React bindings for persisted map viewport usecase.
 * Initial camera: URL when share has lat+lng, else localStorage. Updates sync both in App.
 */
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useRef } from "react"

export type { StoredViewport }

export function useMapViewport(share: MapShareSearch = { lat: null, lng: null, z: null, p: null }) {
  const storedViewport = useAtomValue(mapViewportAtom)
  const setStoredViewport = useAtomSet(mapViewportAtom)
  // Snapshot once for MapLibre initialViewState — later edits sync localStorage + URL in App.
  const initialViewStateRef = useRef<ReturnType<typeof resolveInitialViewState> | null>(null)
  if (initialViewStateRef.current === null) {
    initialViewStateRef.current = resolveShareViewState(share, storedViewport)
  }

  return { storedViewport, setStoredViewport, initialViewState: initialViewStateRef.current }
}
