import { describe, expect, test } from "bun:test"

import { DEFAULT_VIEW_STATE } from "./map-viewport"

describe("DEFAULT_VIEW_STATE", () => {
  test("centers near Tokyo at overview zoom", () => {
    expect(DEFAULT_VIEW_STATE.longitude).toBeCloseTo(139.6917)
    expect(DEFAULT_VIEW_STATE.latitude).toBeCloseTo(35.6895)
    expect(DEFAULT_VIEW_STATE.zoom).toBe(11)
  })
})
