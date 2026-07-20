/**
 * React bindings for shareable map URL search params (nuqs + Effect parsers).
 */
import { mapShareSearchParams, type MapShareSearch } from "@/app/config/map-share-search"
import { useQueryStates } from "nuqs"

export type { MapShareSearch }

const shareOptions = {
  history: "replace" as const,
  /** Safari History API is strict; map moveEnd can fire often. */
  throttleMs: 400
}

export function useMapShareSearch() {
  return useQueryStates(mapShareSearchParams, shareOptions)
}
