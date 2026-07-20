import { LoadStatus } from "@/app/config/load-status"
import { describe, expect, test } from "@effect/vitest"

import { mapPropertyLoadError, PropertyError, propertyContributeUrl, propertySourceUrl } from "./property.repository"

describe("property URL helpers", () => {
  test("delegates to shared Oshima URLs", () => {
    expect(propertySourceUrl("key")).toContain("?p=key")
    expect(propertyContributeUrl()).toContain("oshimaland.com")
  })
})

describe("mapPropertyLoadError", () => {
  test("maps PropertyError including cloudflare flag", () => {
    const error = new PropertyError({
      message: "blocked",
      cloudflare: true,
      key: "k1",
      sourceUrl: "https://example.com/s",
      contributeUrl: "https://example.com/c"
    })
    expect(mapPropertyLoadError("k1", error)).toEqual({
      status: LoadStatus.Error,
      message: "blocked",
      cloudflare: true,
      sourceUrl: "https://example.com/s",
      contributeUrl: "https://example.com/c"
    })
  })

  test("falls back for unknown causes", () => {
    const mapped = mapPropertyLoadError("k2", new Error("boom"))
    expect(mapped.status).toBe(LoadStatus.Error)
    expect(mapped.message).toBe("boom")
    expect(mapped.cloudflare).toBe(false)
    expect(mapped.sourceUrl).toBe(propertySourceUrl("k2"))
    expect(mapped.contributeUrl).toBe(propertyContributeUrl())
  })

  test("stringifies non-Error causes", () => {
    expect(mapPropertyLoadError("k3", "nope").message).toBe("nope")
  })
})
