/**
 * Places autocomplete + details: wrap HTTP + map JSON into domain types.
 */
import { apiFetchAdapter, HttpError } from "@/app/adapter/http.adapter"
import { apiPath } from "@/shared/http/api"
import { Effect, Schema } from "effect"

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

export class PlaceError extends Schema.TaggedErrorClass<PlaceError>()("PlaceError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

const PlaceSuggestionSchema = Schema.Struct({
  placeId: Schema.String,
  label: Schema.String,
  mainText: Schema.String,
  secondaryText: Schema.String,
  lat: Schema.optionalKey(Schema.Number),
  lng: Schema.optionalKey(Schema.Number)
})

const AutocompleteResponseSchema = Schema.Struct({
  suggestions: Schema.optionalKey(Schema.Array(PlaceSuggestionSchema)),
  error: Schema.optionalKey(Schema.String)
})

const PlaceDetailResponseSchema = Schema.Struct({
  placeId: Schema.String,
  name: Schema.String,
  address: Schema.String,
  lat: Schema.Number,
  lng: Schema.Number,
  error: Schema.optionalKey(Schema.String)
})

const parseJsonBody = Effect.fn("place.parseJsonBody")(function* (res: Response, label: string) {
  const unknown = yield* Effect.tryPromise({
    try: (): Promise<unknown> => res.json(),
    catch: (cause) => new PlaceError({ message: `${label} parse failed`, cause })
  })
  return unknown
})

/** Autocomplete → PlaceSuggestion[]. */
export const autocompletePlace = Effect.fn("place.autocompletePlace")(function* (query: string) {
  const url = new URL(apiPath("/places/autocomplete"), location.origin)
  url.searchParams.set("q", query)
  const res = yield* apiFetchAdapter(url).pipe(
    Effect.mapError(
      (cause) =>
        cause instanceof PlaceError
          ? cause
          : new PlaceError({
              message: cause instanceof HttpError ? cause.message : "Place search failed",
              cause
            })
    )
  )
  const unknown = yield* parseJsonBody(res, "Search response")
  const json = yield* Schema.decodeUnknownEffect(AutocompleteResponseSchema)(unknown).pipe(
    Effect.mapError((cause) => new PlaceError({ message: "Search response failed schema check", cause }))
  )
  if (!res.ok) {
    return yield* new PlaceError({ message: json.error ?? `Search failed (${res.status})` })
  }
  return json.suggestions ?? []
})

/** Place details → PlaceResult. */
export const fetchPlaceDetail = Effect.fn("place.fetchPlaceDetail")(function* (placeId: string) {
  const url = new URL(apiPath("/places/details"), location.origin)
  url.searchParams.set("placeId", placeId)
  const res = yield* apiFetchAdapter(url).pipe(
    Effect.mapError(
      (cause) =>
        cause instanceof PlaceError
          ? cause
          : new PlaceError({
              message: cause instanceof HttpError ? cause.message : "Place lookup failed",
              cause
            })
    )
  )
  const unknown = yield* parseJsonBody(res, "Place lookup")
  const json = yield* Schema.decodeUnknownEffect(PlaceDetailResponseSchema)(unknown).pipe(
    Effect.mapError((cause) => new PlaceError({ message: "Place lookup failed schema check", cause }))
  )
  if (!res.ok) {
    return yield* new PlaceError({ message: json.error ?? `Place lookup failed (${res.status})` })
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
export const resolvePlaceSelection = Effect.fn("place.resolvePlaceSelection")(function* (
  suggestion: PlaceSuggestion
) {
  const mapped = mapSuggestionToPlaceResult(suggestion)
  if (mapped) return mapped
  return yield* fetchPlaceDetail(suggestion.placeId)
})
