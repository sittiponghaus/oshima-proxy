import { clearRouteCacheMemory } from "@/server/runtime/response-cache"
import { beforeEach, describe, expect, test } from "@effect/vitest"

import { authorizedHeaders, bootstrapCsrf, createApiHandler } from "./helpers/app-handler"

beforeEach(() => {
  clearRouteCacheMemory()
})

describe("property integration", () => {
  test("normalizes English upstream JSON", async () => {
    const handler = createApiHandler({
      upstream: (request) => {
        expect(request.url).toContain("/d_en/en-ok.json")
        return new Response(
          JSON.stringify({
            key: "en-ok",
            lat: 35.1,
            lng: 139.2,
            dt: "2020",
            ad: "Somewhere",
            info: "Report",
            images: [{ name: "p.jpg" }],
            links: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/property/en-ok", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      key: string
      address: string
      images: Array<{ url: string }>
      sourceUrl: string
    }
    expect(json.key).toBe("en-ok")
    expect(json.address).toBe("Somewhere")
    expect(json.images[0]?.url).toContain("p.jpg")
    expect(json.sourceUrl).toContain("?p=en-ok")
  })

  test("falls back to JP JSON when EN is missing", async () => {
    const urls: string[] = []
    const handler = createApiHandler({
      upstream: (request) => {
        urls.push(request.url)
        if (request.url.includes("/d_en/")) {
          return new Response("not found", { status: 404 })
        }
        return new Response(
          JSON.stringify({
            key: "jp-fallback",
            info: "JP report",
            images: [],
            links: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/property/jp-fallback", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(200)
    expect(urls.some((u) => u.includes("oshimaland.com"))).toBe(true)
    expect(urls.some((u) => u.includes("oshimaland.co.jp"))).toBe(true)
    await expect(response.json()).resolves.toMatchObject({ key: "jp-fallback", info: "JP report" })
  })

  test("rejects invalid keys", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("{}", { status: 200 })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/property/bad%20key!", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(400)
  })

  test("returns cloudflare 502 when challenge HTML is detected", async () => {
    const handler = createApiHandler({
      upstream: () =>
        new Response("<html>challenge-platform cdn-cgi</html>", {
          status: 403,
          headers: { "content-type": "text/html" }
        })
    })
    const csrf = await bootstrapCsrf(handler)
    const response = await handler(
      new Request("http://localhost/api/v1/property/cf-blocked", {
        headers: authorizedHeaders(csrf)
      })
    )
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({ cloudflare: true })
  })
})
