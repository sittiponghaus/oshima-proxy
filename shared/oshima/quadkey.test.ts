import { describe, expect, test } from "@effect/vitest"

import {
  OSHIMA_MARKER_TILE_ZOOM,
  clip,
  latLngToPixel,
  oshimaTileZoom,
  quadkeysForBounds,
  tileToQuadkey
} from "./quadkey"

describe("clip", () => {
  test("clamps to inclusive bounds", () => {
    expect(clip(5, 0, 10)).toBe(5)
    expect(clip(-1, 0, 10)).toBe(0)
    expect(clip(11, 0, 10)).toBe(10)
  })
})

describe("tileToQuadkey", () => {
  test("returns W at zoom 0", () => {
    expect(tileToQuadkey(0, 0, 0)).toBe("W")
  })

  test("returns digit string at higher zooms", () => {
    const key = tileToQuadkey(1, 1, 2)
    expect(key).toMatch(/^[0-3]+$/)
    expect(key.length).toBe(2)
  })
})

describe("latLngToPixel", () => {
  test("maps Tokyo into the tile plane", () => {
    const tile = latLngToPixel(35.6895, 139.6917, 11)
    expect(tile.zoom).toBe(11)
    expect(tile.x).toBeGreaterThan(0)
    expect(tile.y).toBeGreaterThan(0)
  })

  test("clips polar latitudes", () => {
    const north = latLngToPixel(90, 0, 5)
    const clipped = latLngToPixel(85.05112878, 0, 5)
    expect(north.y).toBe(clipped.y)
  })
})

describe("oshimaTileZoom", () => {
  test("floors and clamps to 1..16", () => {
    expect(oshimaTileZoom(0)).toBe(1)
    expect(oshimaTileZoom(11.9)).toBe(11)
    expect(oshimaTileZoom(16)).toBe(16)
    expect(oshimaTileZoom(20)).toBe(OSHIMA_MARKER_TILE_ZOOM)
  })
})

describe("quadkeysForBounds", () => {
  test("returns sorted unique keys covering a viewport", () => {
    const keys = quadkeysForBounds({ lat: 35.7, lng: 139.8 }, { lat: 35.6, lng: 139.6 }, 12)
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).toEqual([...keys].sort())
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("deep map zoom still uses z16 keys for stability", () => {
    const ne = { lat: 35.691, lng: 139.695 }
    const sw = { lat: 35.688, lng: 139.688 }
    const at16 = quadkeysForBounds(ne, sw, 16)
    const at20 = quadkeysForBounds(ne, sw, oshimaTileZoom(20))
    expect(at20).toEqual(at16)
  })
})
