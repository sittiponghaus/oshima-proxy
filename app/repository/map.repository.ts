/**
 * Map tile repository: HTTP adapter + wire→domain mapping.
 */
import { ApiHttp, HttpClientRequest, HttpClientResponse, HttpError } from "@/app/adapter/http.adapter"
import { apiPath } from "@/shared/http/api"
import { oshimaTileZoom, quadkeysForBounds } from "@/shared/oshima/quadkey"
import {
  flattenCluster,
  flattenMarker,
  MapRequest,
  MapResponse,
  type MapCluster,
  type MapMarker,
  type MapRequest as MapRequestType
} from "@/shared/oshima/schema"
import { Effect, Schema } from "effect"

export type { MapCluster, MapMarker }

export class MapError extends Schema.TaggedErrorClass<MapError>()("MapError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

export type MapViewportBounds = {
  readonly ne: { lat: number; lng: number }
  readonly sw: { lat: number; lng: number }
  readonly zoom: number
}

export type MapTileLoad = {
  readonly markers: MapMarker[]
  readonly clusters: MapCluster[]
}

export function mapTileKeySignature(viewport: MapViewportBounds): string {
  const zoom = oshimaTileZoom(viewport.zoom)
  return quadkeysForBounds(viewport.ne, viewport.sw, zoom).join("\0")
}

const toMapError = (message: string, cause?: unknown) =>
  cause instanceof MapError ? cause : new MapError({ message, cause })

/** Fetch tiles for a keys signature and map to presentation markers/clusters. */
export const loadMapTile = Effect.fn("map.loadMapTile")(function* (keysSignature: string) {
  const keys = keysSignature.split("\0").filter(Boolean)
  const body: MapRequestType = { keys }

  const encoded = yield* HttpClientRequest.post(apiPath("/map")).pipe(
    HttpClientRequest.schemaBodyJson(MapRequest)(body),
    Effect.mapError((cause) => toMapError("Failed to encode map request", cause))
  )

  const http = yield* ApiHttp
  const response = yield* http.execute(encoded).pipe(
    Effect.mapError((cause) => toMapError(cause instanceof HttpError ? cause.message : "Map request failed", cause))
  )

  if (response.status < 200 || response.status >= 300) {
    return yield* new MapError({ message: `Map proxy returned HTTP ${response.status}` })
  }

  const wire = yield* HttpClientResponse.schemaBodyJson(MapResponse)(response).pipe(
    Effect.mapError((cause) => toMapError("Map response failed schema check", cause))
  )

  return {
    markers: flattenMarker(wire),
    clusters: flattenCluster(wire)
  } satisfies MapTileLoad
})
