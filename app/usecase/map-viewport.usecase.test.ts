import { describe, expect, test } from "bun:test"

import { DEFAULT_VIEW_STATE, resolveInitialViewState } from "./map-viewport.usecase"

describe("resolveInitialViewState", () => {
  test("returns stored viewport when present", () => {
    const stored = { longitude: 1, latitude: 2, zoom: 3 }
    expect(resolveInitialViewState(stored)).toEqual(stored)
  })

  test("falls back to Tokyo default", () => {
    expect(resolveInitialViewState(null)).toEqual(DEFAULT_VIEW_STATE)
  })
})
