/**
 * Places search usecase — Effect programs; run at the UI edge.
 */
import * as placeRepository from "@/app/repository/place.repository"
import type { PlaceResult, PlaceSuggestion } from "@/app/repository/place.repository"
import { Effect } from "effect"

export type { PlaceResult, PlaceSuggestion }
export { PlaceError } from "@/app/repository/place.repository"

const MIN_QUERY_LENGTH = 2

export function shouldSearchPlace(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH
}

export const searchPlace = Effect.fn("usecase.searchPlace")(function* (query: string) {
  const q = query.trim()
  if (!shouldSearchPlace(q)) return []
  return yield* placeRepository.autocompletePlace(q)
})

export const resolvePlaceSelection = Effect.fn("usecase.resolvePlaceSelection")(function* (
  suggestion: PlaceSuggestion
) {
  return yield* placeRepository.resolvePlaceSelection(suggestion)
})
