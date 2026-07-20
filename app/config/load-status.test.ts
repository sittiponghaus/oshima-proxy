import { describe, expect, test } from "@effect/vitest"

import { LoadStatus } from "./load-status"

describe("LoadStatus", () => {
  test("exposes async lifecycle values", () => {
    expect(LoadStatus.Idle).toBe("idle")
    expect(LoadStatus.Loading).toBe("loading")
    expect(LoadStatus.Error).toBe("error")
    expect(LoadStatus.Ready).toBe("ready")
  })
})
