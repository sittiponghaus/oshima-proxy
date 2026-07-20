/**
 * Map tiles usecase — Effect programs; run at the UI edge.
 */
import * as mapRepository from "@/app/repository/map.repository"
import type { MapCluster, MapMarker, MapTileLoad, MapViewportBounds } from "@/app/repository/map.repository"
import { Effect } from "effect"

export type { MapCluster, MapMarker, MapTileLoad, MapViewportBounds }
export { MapError } from "@/app/repository/map.repository"

export function mapTileKeySignature(viewport: MapViewportBounds): string {
  return mapRepository.mapTileKeySignature(viewport)
}

export const loadMapTile = Effect.fn("usecase.loadMapTile")(function* (keysSignature: string) {
  return yield* mapRepository.loadMapTile(keysSignature)
})
