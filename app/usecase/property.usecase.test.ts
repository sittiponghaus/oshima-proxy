import { describe, expect, test } from "bun:test"

import { LoadStatus } from "@/app/config/load-status"
import { OshimaPropertyError } from "@/app/adapter/oshima/client.adapter"

import { propertyLoadErrorFromCause, propertySourceUrl } from "./property.usecase"

describe("propertyLoadErrorFromCause", () => {
  test("delegates to repository mapping", () => {
    const cause = new OshimaPropertyError({
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
