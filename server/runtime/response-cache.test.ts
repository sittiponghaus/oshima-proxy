import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

import {
  cacheKeyMap,
  cacheKeyPlacesAutocomplete,
  cacheKeyPlacesDetails,
  cacheKeyReport,
  withRouteCache
} from "./response-cache"

describe("cache keys", () => {
  test("sorts map keys for stable signatures", () => {
    expect(cacheKeyMap(["b", "a"])).toBe(cacheKeyMap(["a", "b"]))
    expect(cacheKeyMap(["a", "b"])).toBe("map:a,b")
  })

  test("normalizes places keys", () => {
    expect(cacheKeyPlacesAutocomplete("  Tokyo ")).toBe("places:autocomplete:tokyo")
    expect(cacheKeyPlacesDetails("n123")).toBe("places:details:N123")
    expect(cacheKeyReport("abc")).toBe("report:abc")
  })
})

describe("withRouteCache", () => {
  test("stores JSON and serves 304 on matching If-None-Match", async () => {
    const cacheKey = `places:test:${crypto.randomUUID()}`

    const first = await Effect.runPromise(
      withRouteCache({
        kind: "places",
        cacheKey,
        load: Effect.succeed({ ok: true })
      }).pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(new Request("http://localhost/api"))
        )
      )
    )
    const firstWeb = HttpServerResponse.toWeb(first)
    expect(firstWeb.status).toBe(200)
    expect(await firstWeb.text()).toBe('{"ok":true}')
    const etag = firstWeb.headers.get("etag")
    expect(etag).toBeTruthy()

    const second = await Effect.runPromise(
      withRouteCache({
        kind: "places",
        cacheKey,
        load: Effect.succeed({ shouldNotRun: true })
      }).pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromWeb(
            new Request("http://localhost/api", {
              headers: { "if-none-match": etag! }
            })
          )
        )
      )
    )
    expect(HttpServerResponse.toWeb(second).status).toBe(304)
  })
})
