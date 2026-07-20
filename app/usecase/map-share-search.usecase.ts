/**
 * Resolve map camera / selected property from shareable URL search params.
 *
 * Contract:
 * - Visit with no camera query params (`lat`+`lng`) → use localStorage (else default).
 * - Visit with `lat`+`lng` → URL camera wins (zoom from `z`, else storage, else default).
 * - On viewport updates → persist to localStorage and the query string together (see App sync).
 */
import { DEFAULT_VIEW_STATE } from "@/app/config/map-viewport"
import type { MapShareSearch } from "@/app/config/map-share-search"
import type { StoredViewport } from "@/app/store/map-viewport.store"
import type { MapMarker } from "@/app/usecase/map-tile.usecase"
import { resolveInitialViewState } from "@/app/usecase/map-viewport.usecase"

export type { MapShareSearch }

/**
 * Initial map camera: query params when `lat`+`lng` are set; otherwise localStorage
 * (via {@link resolveInitialViewState}).
 */
export function resolveShareViewState(share: MapShareSearch, stored: StoredViewport | null): StoredViewport {
  if (share.lat != null && share.lng != null) {
    return {
      latitude: share.lat,
      longitude: share.lng,
      zoom: share.z ?? stored?.zoom ?? DEFAULT_VIEW_STATE.zoom
    }
  }
  return resolveInitialViewState(stored)
}

/**
 * Active property from `p`. Prefer a live map marker when tiles include the key;
 * otherwise open the panel from the key alone (optional lat/lng fallbacks).
 */
export function resolveSelectedMarker(
  share: MapShareSearch,
  markers: readonly MapMarker[]
): MapMarker | null {
  if (share.p == null) return null
  const found = markers.find((marker) => marker.key === share.p)
  if (found) return found
  return {
    key: share.p,
    latitude: share.lat ?? 0,
    longitude: share.lng ?? 0,
    cluster_key: ""
  }
}
