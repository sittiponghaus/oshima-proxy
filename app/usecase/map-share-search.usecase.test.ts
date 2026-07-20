import { describe, expect, test } from "@effect/vitest"

import { DEFAULT_VIEW_STATE } from "@/app/config/map-viewport"
import { resolveSelectedMarker, resolveShareViewState } from "./map-share-search.usecase"

describe("resolveShareViewState", () => {
  test("uses URL lat/lng when both present", () => {
    expect(
      resolveShareViewState({ lat: 35.1, lng: 139.2, z: 14, p: null }, null)
    ).toEqual({ latitude: 35.1, longitude: 139.2, zoom: 14 })
  })

  test("fills zoom from storage then default when URL omits z", () => {
    expect(
      resolveShareViewState(
        { lat: 1, lng: 2, z: null, p: null },
        { latitude: 9, longitude: 8, zoom: 7 }
      )
    ).toEqual({ latitude: 1, longitude: 2, zoom: 7 })

    expect(resolveShareViewState({ lat: 1, lng: 2, z: null, p: null }, null)).toEqual({
      latitude: 1,
      longitude: 2,
      zoom: DEFAULT_VIEW_STATE.zoom
    })
  })

  test("without camera query params uses localStorage (not URL/defaults alone)", () => {
    const stored = { latitude: 1, longitude: 2, zoom: 3 }
    expect(resolveShareViewState({ lat: null, lng: null, z: null, p: null }, stored)).toEqual(stored)
    // Property-only share still hydrates camera from localStorage.
    expect(resolveShareViewState({ lat: null, lng: null, z: null, p: "m1" }, stored)).toEqual(stored)
  })

  test("falls back to stored / default when lat or lng missing", () => {
    const stored = { latitude: 1, longitude: 2, zoom: 3 }
    expect(resolveShareViewState({ lat: 9, lng: null, z: 5, p: null }, stored)).toEqual(stored)
    expect(resolveShareViewState({ lat: null, lng: null, z: null, p: null }, null)).toEqual(
      DEFAULT_VIEW_STATE
    )
  })
})

describe("resolveSelectedMarker", () => {
  const markers = [
    { key: "m1", latitude: 1, longitude: 2, cluster_key: "c1" },
    { key: "m2", latitude: 3, longitude: 4, cluster_key: "c2" }
  ] as const

  test("returns null when p is absent", () => {
    expect(resolveSelectedMarker({ lat: null, lng: null, z: null, p: null }, markers)).toBeNull()
  })

  test("prefers a live marker from tiles", () => {
    expect(resolveSelectedMarker({ lat: null, lng: null, z: null, p: "m2" }, markers)).toEqual(
      markers[1]
    )
  })

  test("builds a stub marker when tiles do not include the key yet", () => {
    expect(
      resolveSelectedMarker({ lat: 10, lng: 20, z: null, p: "missing" }, markers)
    ).toEqual({
      key: "missing",
      latitude: 10,
      longitude: 20,
      cluster_key: ""
    })
  })
})
