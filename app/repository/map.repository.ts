/**
 * Map tiles: wrap Oshima adapter + map raw responses to markers/clusters.
 */
import { fetchMapTiles as fetchMapTilesAdapter } from "@/app/adapter/oshima/client.adapter"
import { oshimaTileZoom, quadkeysForBounds } from "@/shared/oshima/quadkey"
import { flattenClusters, flattenMarkers, type MapCluster, type MapMarker } from "@/shared/oshima/schema"
import { Effect } from "effect"

export type { MapCluster, MapMarker }

export type MapViewportBounds = {
  readonly ne: { lat: number; lng: number }
  readonly sw: { lat: number; lng: number }
  readonly zoom: number
}

export type MapTilesLoad = {
  readonly markers: MapMarker[]
  readonly clusters: MapCluster[]
}

/**
 * Stable signature so deep zoom inside the same z≤16 tiles does not refetch
 * (Oshimaland skips when prevTileBounds still contains the view).
 */
export function mapTilesKeysSignature(viewport: MapViewportBounds): string {
  const zoom = oshimaTileZoom(viewport.zoom)
  return quadkeysForBounds(viewport.ne, viewport.sw, zoom).join("\0")
}

/** Fetch tiles for a keys signature and map to presentation markers/clusters. */
export const loadMapTiles = (keysSignature: string) =>
  Effect.gen(function* () {
    const keys = keysSignature.split("\0").filter(Boolean)
    const response = yield* fetchMapTilesAdapter({ keys })
    return {
      markers: flattenMarkers(response),
      clusters: flattenClusters(response)
    } satisfies MapTilesLoad
  })
