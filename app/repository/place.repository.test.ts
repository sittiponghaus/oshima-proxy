import { describe, expect, test } from "@effect/vitest"

import { mapSuggestionToPlaceResult, type PlaceSuggestion } from "./place.repository"

const base: PlaceSuggestion = {
  placeId: "N1",
  label: "Tokyo, Japan",
  mainText: "Tokyo",
  secondaryText: "Japan",
  lat: 35.6,
  lng: 139.7
}

describe("mapSuggestionToPlaceResult", () => {
  test("maps finite coords into PlaceResult", () => {
    expect(mapSuggestionToPlaceResult(base)).toEqual({
      placeId: "N1",
      name: "Tokyo",
      address: "Tokyo, Japan",
      lat: 35.6,
      lng: 139.7
    })
  })

  test("falls back to label when mainText is empty", () => {
    expect(mapSuggestionToPlaceResult({ ...base, mainText: "" })?.name).toBe("Tokyo, Japan")
  })

  test("returns null for missing or non-finite coords", () => {
    expect(mapSuggestionToPlaceResult({ ...base, lat: undefined })).toBeNull()
    expect(mapSuggestionToPlaceResult({ ...base, lng: Number.NaN })).toBeNull()
    expect(mapSuggestionToPlaceResult({ ...base, lat: Number.POSITIVE_INFINITY })).toBeNull()
  })
})
