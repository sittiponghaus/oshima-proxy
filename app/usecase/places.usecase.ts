/**
 * Places search usecase: call repository + run Effect.
 */
import * as placesRepository from "@/app/repository/places.repository"
import type { PlaceResult, PlaceSuggestion } from "@/app/repository/places.repository"
import { Effect } from "effect"

export type { PlaceResult, PlaceSuggestion }

const MIN_QUERY_LENGTH = 2

export function shouldSearchPlaces(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH
}

export function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (!shouldSearchPlaces(q)) return Promise.resolve([])
  return Effect.runPromise(placesRepository.autocompletePlaces(q))
}

export function resolvePlaceSelection(suggestion: PlaceSuggestion): Promise<PlaceResult> {
  return Effect.runPromise(placesRepository.resolvePlaceSelection(suggestion))
}
