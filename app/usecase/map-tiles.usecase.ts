import * as mapRepository from "@/app/repository/map.repository"
import type { MapCluster, MapMarker, MapTilesLoad, MapViewportBounds } from "@/app/repository/map.repository"
/**
 * Map tiles usecase: call repository + run Effect.
 */
import { Effect } from "effect"

export type { MapCluster, MapMarker, MapTilesLoad, MapViewportBounds }

export function mapTilesKeysSignature(viewport: MapViewportBounds): string {
  return mapRepository.mapTilesKeysSignature(viewport)
}

export function loadMapTiles(keysSignature: string): Promise<MapTilesLoad> {
  return Effect.runPromise(mapRepository.loadMapTiles(keysSignature))
}
