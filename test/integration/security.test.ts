import { beforeEach, describe, expect, test } from "@effect/vitest"

import { clearRouteCacheMemory } from "@/server/runtime/response-cache"

import { authorizedHeaders, bootstrapCsrf, createApiHandler } from "./helpers/app-handler"

beforeEach(() => {
  clearRouteCacheMemory()
})

describe("security middleware integration", () => {
  test("rejects mutating API calls without CSRF / client header", async () => {
    const handler = createApiHandler({
      upstream: () => new Response(JSON.stringify({ markers: {}, clusters: {} }), { status: 200 })
    })
    const response = await handler(
      new Request("http://localhost/api/v1/map", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json"
        },
        body: JSON.stringify({ keys: ["1"] })
      })
    )
    expect(response.status).toBe(403)
  })

  test("allows map POST with CSRF bootstrap + client marker", async () => {
    const handler = createApiHandler({
      upstream: (request) => {
        expect(request.url.includes("api.oshimaland.co.jp/map")).toBe(true)
        return new Response(JSON.stringify({ markers: {}, clusters: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
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
    await expect(response.json()).resolves.toEqual({ markers: {}, clusters: {} })
  })

  test("rejects cross-origin API requests", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("{}", { status: 200 })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/map", {
        method: "POST",
        headers: {
          ...authorizedHeaders(csrf),
          origin: "https://evil.example",
          "content-type": "application/json"
        },
        body: JSON.stringify({ keys: ["1"] })
      })
    )
    expect(response.status).toBe(403)
  })
})
