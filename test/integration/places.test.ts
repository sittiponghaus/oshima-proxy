import { beforeEach, describe, expect, test } from "bun:test"

import { clearRouteCacheMemory } from "@/server/runtime/response-cache"

import { authorizedHeaders, bootstrapCsrf, createApiHandler } from "./helpers/app-handler"

beforeEach(() => {
  clearRouteCacheMemory()
})

describe("places integration", () => {
  test("returns empty suggestions for short queries without upstream", async () => {
    let upstreamCalls = 0
    const handler = createApiHandler({
      upstream: () => {
        upstreamCalls += 1
        return new Response("[]", { status: 200 })
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/places/autocomplete?q=a", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ suggestions: [] })
    expect(upstreamCalls).toBe(0)
  })

  test("maps nominatim search rows into suggestions", async () => {
    const handler = createApiHandler({
      upstream: (request) => {
        expect(request.url).toContain("nominatim.openstreetmap.org/search")
        return new Response(
          JSON.stringify([
            {
              place_id: 1,
              osm_type: "node",
              osm_id: 123,
              lat: "35.68",
              lon: "139.76",
              display_name: "Tokyo, Japan",
              name: "Tokyo"
            },
            {
              place_id: 2,
              lat: "bad",
              lon: "bad",
              display_name: "skip me"
            }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/places/autocomplete?q=tokyo", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(200)
    const json = (await response.json()) as { suggestions: Array<{ placeId: string; lat: number }> }
    expect(json.suggestions).toHaveLength(1)
    expect(json.suggestions[0]?.placeId).toBe("N123")
    expect(json.suggestions[0]?.lat).toBeCloseTo(35.68)
  })

  test("looks up OSM place details", async () => {
    const handler = createApiHandler({
      upstream: (request) => {
        expect(request.url).toContain("nominatim.openstreetmap.org/lookup")
        expect(request.url).toContain("osm_ids=N42")
        return new Response(
          JSON.stringify([
            {
              osm_type: "node",
              osm_id: 42,
              lat: "35.0",
              lon: "139.0",
              display_name: "Somewhere",
              name: "Place"
            }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/places/details?placeId=n42", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      placeId: "N42",
      name: "Place",
      lat: 35,
      lng: 139
    })
  })

  test("rejects non-OSM place ids", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("[]", { status: 200 })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/places/details?placeId=not-osm", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(400)
  })
})
