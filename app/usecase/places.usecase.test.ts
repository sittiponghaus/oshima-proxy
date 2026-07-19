import { describe, expect, test } from "bun:test"

import { resolvePlaceSelection, searchPlaces, shouldSearchPlaces, type PlaceSuggestion } from "./places.usecase"

describe("shouldSearchPlaces", () => {
  test("requires at least 2 non-whitespace characters", () => {
    expect(shouldSearchPlaces("")).toBe(false)
    expect(shouldSearchPlaces(" ")).toBe(false)
    expect(shouldSearchPlaces("a")).toBe(false)
    expect(shouldSearchPlaces(" ab")).toBe(true)
    expect(shouldSearchPlaces("tokyo")).toBe(true)
  })
})

describe("searchPlaces", () => {
  test("short-circuits without network for short queries", async () => {
    expect(await searchPlaces("a")).toEqual([])
    expect(await searchPlaces("  ")).toEqual([])
  })
})

describe("resolvePlaceSelection", () => {
  test("uses inline coords without fetching details", async () => {
    const suggestion: PlaceSuggestion = {
      placeId: "N1",
      label: "Tokyo, Japan",
      mainText: "Tokyo",
      secondaryText: "Japan",
      lat: 35.6,
      lng: 139.7
    }
    await expect(resolvePlaceSelection(suggestion)).resolves.toEqual({
      placeId: "N1",
      name: "Tokyo",
      address: "Tokyo, Japan",
      lat: 35.6,
      lng: 139.7
    })
  })
})
