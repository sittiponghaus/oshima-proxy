import { LoadStatus } from "@/app/config/load-status"
import { PropertyError } from "@/app/repository/property.repository"
import { describe, expect, test } from "@effect/vitest"

import { propertyLoadErrorFromCause, propertySourceUrl } from "./property.usecase"

describe("propertyLoadErrorFromCause", () => {
  test("delegates to repository mapping", () => {
    const cause = new PropertyError({
      message: "cf",
      cloudflare: true,
      key: "k"
    })
    const mapped = propertyLoadErrorFromCause("k", cause)
    expect(mapped.status).toBe(LoadStatus.Error)
    expect(mapped.cloudflare).toBe(true)
    expect(mapped.sourceUrl).toBe(propertySourceUrl("k"))
  })
})
