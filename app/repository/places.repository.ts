/**
 * Places autocomplete + details: wrap HTTP + map JSON into domain types.
 */
import { apiPath } from "@/app/config/http"
import { apiFetch } from "@/app/repository/csrf.repository"
import { Effect } from "effect"

export type PlaceSuggestion = {
  placeId: string
  label: string
  mainText: string
  secondaryText: string
  lat?: number
  lng?: number
}

export type PlaceResult = {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

const parseJson = <A>(res: Response, label: string) =>
  Effect.tryPromise({
    try: () => res.json() as Promise<A>,
    catch: (cause) => new Error(`${label} parse failed`, { cause })
  })

/** Autocomplete → PlaceSuggestion[]. */
export const autocompletePlaces = (query: string) =>
  Effect.gen(function* () {
    const url = new URL(apiPath("/places/autocomplete"), location.origin)
    url.searchParams.set("q", query)
    const res = yield* apiFetch(url)
    const json = yield* parseJson<{ suggestions?: PlaceSuggestion[]; error?: string }>(res, "Search response")
    if (!res.ok) {
      return yield* Effect.fail(new Error(json.error ?? `Search failed (${res.status})`))
    }
    return json.suggestions ?? []
  })

/** Place details → PlaceResult. */
export const fetchPlaceDetails = (placeId: string) =>
  Effect.gen(function* () {
    const url = new URL(apiPath("/places/details"), location.origin)
    url.searchParams.set("placeId", placeId)
    const res = yield* apiFetch(url)
    const json = yield* parseJson<PlaceResult & { error?: string }>(res, "Place lookup")
    if (!res.ok) {
      return yield* Effect.fail(new Error(json.error ?? `Place lookup failed (${res.status})`))
    }
    return {
      placeId: json.placeId,
      name: json.name,
      address: json.address,
      lat: json.lat,
      lng: json.lng
    } satisfies PlaceResult
  })

/** Map suggestion with inline coords → PlaceResult (no I/O). */
export function mapSuggestionToPlaceResult(suggestion: PlaceSuggestion): PlaceResult | null {
  if (
    typeof suggestion.lat !== "number" ||
    typeof suggestion.lng !== "number" ||
    !Number.isFinite(suggestion.lat) ||
    !Number.isFinite(suggestion.lng)
  ) {
    return null
  }
  return {
    placeId: suggestion.placeId,
    name: suggestion.mainText || suggestion.label,
    address: suggestion.label,
    lat: suggestion.lat,
    lng: suggestion.lng
  }
}

/** Resolve suggestion to PlaceResult (inline map or details fetch). */
export const resolvePlaceSelection = (suggestion: PlaceSuggestion) => {
  const mapped = mapSuggestionToPlaceResult(suggestion)
  if (mapped) return Effect.succeed(mapped)
  return fetchPlaceDetails(suggestion.placeId)
}
