import { describe, expect, test } from "@effect/vitest"

import { API_BASE, apiPath } from "./api"

describe("apiPath", () => {
  test("uses versioned base without trailing slash", () => {
    expect(API_BASE).toBe("/api/v1")
    expect(API_BASE.endsWith("/")).toBe(false)
  })

  test("joins paths with a single slash", () => {
    expect(apiPath("/map")).toBe("/api/v1/map")
    expect(apiPath("map")).toBe("/api/v1/map")
    expect(apiPath("/places/autocomplete")).toBe("/api/v1/places/autocomplete")
  })
})
