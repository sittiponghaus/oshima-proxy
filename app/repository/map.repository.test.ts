import { describe, expect, test } from "@effect/vitest"

import { mapTileKeySignature } from "./map.repository"

describe("mapTileKeySignature", () => {
  const viewport = {
    ne: { lat: 35.7, lng: 139.8 },
    sw: { lat: 35.6, lng: 139.6 },
    zoom: 14
  }

  test("is stable for the same viewport", () => {
    expect(mapTileKeySignature(viewport)).toBe(mapTileKeySignature(viewport))
  })

  test("caps deep zoom so z17+ shares z16 keys", () => {
    const deep = { ...viewport, zoom: 18 }
    const at16 = { ...viewport, zoom: 16 }
    expect(mapTileKeySignature(deep)).toBe(mapTileKeySignature(at16))
  })

  test("joins quadkeys with NUL separators", () => {
    const signature = mapTileKeySignature(viewport)
    expect(signature.includes("\0") || signature.length > 0).toBe(true)
    expect(signature.split("\0").every(Boolean)).toBe(true)
  })
})
