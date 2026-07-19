import * as BunHttpClient from "@effect/platform-bun/BunHttpClient"
import { Effect, Layer, Schema } from "effect"
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http"

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"
const NOMINATIM_LOOKUP = "https://nominatim.openstreetmap.org/lookup"
const USER_AGENT = "oshima-proxy/0.1 (local; contact: local-dev)"

const AutocompleteQuery = Schema.Struct({
  q: Schema.String,
})

const DetailsQuery = Schema.Struct({
  placeId: Schema.String,
})

const NominatimResult = Schema.Struct({
  place_id: Schema.optionalKey(Schema.Union([Schema.Number, Schema.String])),
  osm_type: Schema.optionalKey(Schema.String),
  osm_id: Schema.optionalKey(Schema.Union([Schema.Number, Schema.String])),
  lat: Schema.optionalKey(Schema.String),
  lon: Schema.optionalKey(Schema.String),
  display_name: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  address: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String),
  ),
})

const NominatimResults = Schema.Array(NominatimResult)

const jsonError = (status: number, error: string) =>
  HttpServerResponse.jsonUnsafe({ error }, { status })

const withClient = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.provide(BunHttpClient.layer))

const nominatimGet = (url: string) =>
  HttpClientRequest.setHeaders(HttpClientRequest.get(url), {
    accept: "application/json",
    "user-agent": USER_AGENT,
  })

/** Encode Nominatim osm ids for lookup, e.g. `N123` / `W456` / `R789`. */
const toOsmLookupId = (placeId: string): string | null => {
  const trimmed = placeId.trim()
  if (/^[NWR]\d+$/i.test(trimmed)) return trimmed.toUpperCase()
  return null
}

const splitDisplayName = (displayName: string) => {
  const parts = displayName.split(",").map(p => p.trim()).filter(Boolean)
  const mainText = parts[0] ?? displayName
  const secondaryText = parts.slice(1).join(", ")
  return { mainText, secondaryText }
}

const toSuggestion = (row: typeof NominatimResult.Type) => {
  const lat = row.lat != null ? Number(row.lat) : NaN
  const lng = row.lon != null ? Number(row.lon) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const osmType = row.osm_type?.charAt(0).toUpperCase()
  const osmId = row.osm_id != null ? String(row.osm_id) : ""
  const placeId =
    osmType && osmId
      ? `${osmType}${osmId}`
      : row.place_id != null
        ? String(row.place_id)
        : null
  if (!placeId) return null

  const label = row.display_name ?? row.name ?? placeId
  const { mainText, secondaryText } = splitDisplayName(label)

  return {
    placeId,
    label,
    mainText: row.name ?? mainText,
    secondaryText,
    lat,
    lng,
  }
}

export const PlacesRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter

    yield* router.add(
      "GET",
      "/api/places/autocomplete",
      withClient(
        Effect.gen(function* () {
          const query = yield* HttpServerRequest.schemaSearchParams(
            AutocompleteQuery,
          ).pipe(Effect.orElseSucceed(() => ({ q: "" })))
          const q = query.q.trim()
          if (q.length < 2) {
            return HttpServerResponse.jsonUnsafe({ suggestions: [] })
          }

          const endpoint = new URL(NOMINATIM_SEARCH)
          endpoint.searchParams.set("q", q)
          endpoint.searchParams.set("format", "json")
          endpoint.searchParams.set("addressdetails", "1")
          endpoint.searchParams.set("limit", "8")

          const response = yield* HttpClient.execute(
            nominatimGet(endpoint.toString()),
          )
          if (response.status < 200 || response.status >= 300) {
            return jsonError(
              response.status,
              `Nominatim search failed (${response.status})`,
            )
          }

          const raw = yield* HttpClientResponse.schemaBodyJson(NominatimResults)(
            response,
          )
          const suggestions = raw
            .map(toSuggestion)
            .filter((s): s is NonNullable<typeof s> => s !== null)

          return HttpServerResponse.jsonUnsafe({ suggestions })
        }).pipe(
          Effect.catch(() =>
            Effect.succeed(jsonError(502, "Nominatim search unreachable")),
          ),
        ),
      ),
    )

    yield* router.add(
      "GET",
      "/api/places/details",
      withClient(
        Effect.gen(function* () {
          const query = yield* HttpServerRequest.schemaSearchParams(
            DetailsQuery,
          ).pipe(
            Effect.catch(() => Effect.fail(jsonError(400, "placeId is required"))),
          )
          const placeId = query.placeId.trim()
          if (!placeId) {
            return jsonError(400, "placeId is required")
          }

          const osmIds = toOsmLookupId(placeId)
          if (!osmIds) {
            return jsonError(400, "placeId must be an OSM id like N123 / W456 / R789")
          }

          const endpoint = new URL(NOMINATIM_LOOKUP)
          endpoint.searchParams.set("osm_ids", osmIds)
          endpoint.searchParams.set("format", "json")
          endpoint.searchParams.set("addressdetails", "1")

          const response = yield* HttpClient.execute(
            nominatimGet(endpoint.toString()),
          )
          if (response.status < 200 || response.status >= 300) {
            return jsonError(
              response.status,
              `Nominatim lookup failed (${response.status})`,
            )
          }

          const raw = yield* HttpClientResponse.schemaBodyJson(NominatimResults)(
            response,
          )
          const row = raw[0]
          if (!row) {
            return jsonError(404, "Place not found")
          }

          const suggestion = toSuggestion(row)
          if (!suggestion) {
            return jsonError(502, "Place has no location")
          }

          return HttpServerResponse.jsonUnsafe({
            placeId: suggestion.placeId,
            name: suggestion.mainText || suggestion.label,
            address: suggestion.label,
            lat: suggestion.lat,
            lng: suggestion.lng,
          })
        }).pipe(
          Effect.catch(error => {
            if (
              typeof error === "object" &&
              error !== null &&
              "_id" in error &&
              (error as { _id: unknown })._id === "HttpServerResponse"
            ) {
              return Effect.succeed(
                error as HttpServerResponse.HttpServerResponse,
              )
            }
            return Effect.succeed(
              jsonError(502, "Nominatim lookup unreachable"),
            )
          }),
        ),
      ),
    )
  }),
)
