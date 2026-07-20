import { describe, expect, test } from "@effect/vitest"
import { Effect } from "effect"

import { ROUTE_CACHE_POLICY, cacheControlFor, matchesIfNoneMatch, strongEtag, ttlMsFor } from "./cache"

describe("ROUTE_CACHE_POLICY", () => {
  test("exposes TTLs in seconds", () => {
    expect(ROUTE_CACHE_POLICY.map).toBe(60)
    expect(ROUTE_CACHE_POLICY.report).toBe(3600)
    expect(ROUTE_CACHE_POLICY.places).toBe(300)
  })
})

describe("cacheControlFor / ttlMsFor", () => {
  test("builds public cache-control and ms TTL", () => {
    expect(cacheControlFor("map")).toBe("public, max-age=60, s-maxage=60")
    expect(ttlMsFor("places")).toBe(300_000)
  })
})

describe("strongEtag", () => {
  test("returns quoted sha-256 hex", async () => {
    const etag = await Effect.runPromise(strongEtag('{"a":1}'))
    expect(etag).toMatch(/^"[0-9a-f]{64}"$/)
    expect(await Effect.runPromise(strongEtag('{"a":1}'))).toBe(etag)
    expect(await Effect.runPromise(strongEtag('{"a":2}'))).not.toBe(etag)
  })
})

describe("matchesIfNoneMatch", () => {
  test("matches exact and weak ETags", () => {
    const etag = '"abc"'
    expect(matchesIfNoneMatch(etag, etag)).toBe(true)
    expect(matchesIfNoneMatch('W/"abc"', etag)).toBe(true)
    expect(matchesIfNoneMatch('"x", "abc"', etag)).toBe(true)
  })

  test("supports * and rejects missing / mismatched", () => {
    expect(matchesIfNoneMatch("*", '"abc"')).toBe(true)
    expect(matchesIfNoneMatch(undefined, '"abc"')).toBe(false)
    expect(matchesIfNoneMatch('"zzz"', '"abc"')).toBe(false)
  })
})
