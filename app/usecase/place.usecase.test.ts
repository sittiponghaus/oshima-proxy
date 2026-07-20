import { ApiHttpRuntime } from "@/app/runtime/api-http.runtime"
import { describe, expect, test } from "@effect/vitest"

import { resolvePlaceSelection, searchPlace, shouldSearchPlace, type PlaceSuggestion } from "./place.usecase"

describe("shouldSearchPlace", () => {
  test("requires at least 2 non-whitespace characters", () => {
    expect(shouldSearchPlace("")).toBe(false)
    expect(shouldSearchPlace(" ")).toBe(false)
    expect(shouldSearchPlace("a")).toBe(false)
    expect(shouldSearchPlace(" ab")).toBe(true)
    expect(shouldSearchPlace("tokyo")).toBe(true)
  })
})

describe("searchPlace", () => {
  test("short-circuits without network for short queries", async () => {
    expect(await ApiHttpRuntime.runPromise(searchPlace("a"))).toEqual([])
    expect(await ApiHttpRuntime.runPromise(searchPlace("  "))).toEqual([])
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
    await expect(ApiHttpRuntime.runPromise(resolvePlaceSelection(suggestion))).resolves.toEqual({
      placeId: "N1",
      name: "Tokyo",
      address: "Tokyo, Japan",
      lat: 35.6,
      lng: 139.7
    })
  })
})
