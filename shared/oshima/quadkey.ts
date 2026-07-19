/** Bing Maps–style tile helpers used by api.oshimaland.co.jp */

const MIN_ZOOM = 0
const MAX_ZOOM = 23
const MASK_TABLE = Array.from({ length: MAX_ZOOM + 1 }, (_, zoom) => (zoom === 0 ? 0 : 2 ** (zoom - 1)))

export type LatLng = { lat: number; lng: number }

export function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number; zoom: number } {
  const sinLat = Math.sin((clip(lat, -85.05112878, 85.05112878) * Math.PI) / 180)
  const x = (lng + 180) / 360
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)
  const scale = 2 ** zoom
  return {
    x: Math.floor(clip(x * scale, 0, scale - 1)),
    y: Math.floor(clip(y * scale, 0, scale - 1)),
    zoom
  }
}

export function tileToQuadkey(x: number, y: number, zoom: number): string {
  if (zoom === MIN_ZOOM) return "W"
  const depth = Math.min(zoom, MAX_ZOOM)
  const digits: number[] = []
  for (let i = depth; i > 0; i--) {
    let digit = 0
    if ((x & MASK_TABLE[i]!) !== 0) digit += 1
    if ((y & MASK_TABLE[i]!) !== 0) digit += 2
    digits.push(digit)
  }
  return digits.join("")
}

/** Keys covering a viewport AABB at a given zoom (inclusive). */
export function quadkeysForBounds(ne: LatLng, sw: LatLng, zoom: number): string[] {
  const topLeft = latLngToPixel(ne.lat, sw.lng, zoom)
  const bottomRight = latLngToPixel(sw.lat, ne.lng, zoom)
  const keys = new Set<string>()
  for (let y = topLeft.y; y <= bottomRight.y; y++) {
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      keys.add(tileToQuadkey(x, y, zoom))
    }
  }
  return [...keys].sort()
}

/**
 * Deepest tile zoom that `api.oshimaland.co.jp/map` still serves.
 * Matches Oshimaland web (`MarkerOnlyZoom = 16` in `pc.en.js`): keys at 17+
 * return empty `{ markers: {}, clusters: {} }`, which blanked our pins when
 * map zoom went past 16 while we still requested deeper quadkeys.
 */
export const OSHIMA_MARKER_TILE_ZOOM = 16

/**
 * Map zoom → Oshima tile zoom.
 * Cap at {@link OSHIMA_MARKER_TILE_ZOOM} so deep map zoom keeps fetching the
 * last useful tiles (individual markers) instead of empty deeper keys.
 * Lower zooms still return clusters for overview.
 */
export function oshimaTileZoom(mapZoom: number): number {
  return clip(Math.floor(mapZoom), 1, OSHIMA_MARKER_TILE_ZOOM)
}
