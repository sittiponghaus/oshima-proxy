import { beforeEach, describe, expect, test } from "bun:test"

import { clearRouteCacheMemory } from "@/server/runtime/response-cache"

import { authorizedHeaders, bootstrapCsrf, createApiHandler } from "./helpers/app-handler"

beforeEach(() => {
  clearRouteCacheMemory()
})

describe("map integration", () => {
  test("proxies map tiles and returns merged markers/clusters", async () => {
    const handler = createApiHandler({
      upstream: (request) => {
        expect(request.method).toBe("POST")
        expect(request.url).toContain("api.oshimaland.co.jp/map")
        return new Response(
          JSON.stringify({
            markers: {
              k1: [{ key: "m1", latitude: 1, longitude: 2, cluster_key: "c1" }]
            },
            clusters: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/map", {
        method: "POST",
        headers: {
          ...authorizedHeaders(csrf),
          "content-type": "application/json"
        },
        body: JSON.stringify({ keys: ["032010110132"] })
      })
    )
    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      markers: Record<string, Array<{ key: string }>>
    }
    expect(json.markers.k1?.[0]?.key).toBe("m1")
  })

  test("rejects empty keys body", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("{}", { status: 200 })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/map", {
        method: "POST",
        headers: {
          ...authorizedHeaders(csrf),
          "content-type": "application/json"
        },
        body: JSON.stringify({ keys: [] })
      })
    )
    expect(response.status).toBe(400)
  })

  test("surfaces upstream failures as 502", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("nope", { status: 500 })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/map", {
        method: "POST",
        headers: {
          ...authorizedHeaders(csrf),
          "content-type": "application/json"
        },
        body: JSON.stringify({ keys: ["1"] })
      })
    )
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      error: "Upstream map API returned HTTP 500"
    })
  })
})
