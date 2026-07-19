import { beforeEach, describe, expect, test } from "bun:test"

import { clearRouteCacheMemory } from "@/server/runtime/response-cache"

import { CSRF_COOKIE, CSRF_HEADER } from "@/shared/http/security"

import { authorizedHeaders, bootstrapCsrf, createApiHandler } from "./helpers/app-handler"

beforeEach(() => {
  clearRouteCacheMemory()
})

describe("csrf integration", () => {
  test("issues a 64-char token cookie and JSON body", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("unused", { status: 500 })
    })
    const response = await handler(new Request("http://localhost/api/v1/csrf"))
    expect(response.status).toBe(200)
    const json = (await response.json()) as { token: string; header: string }
    expect(json.header).toBe(CSRF_HEADER)
    expect(json.token).toHaveLength(64)
    expect(response.headers.get("cache-control")).toBe("no-store")
    const cookie = response.headers.get("set-cookie") ?? ""
    expect(cookie).toContain(`${CSRF_COOKIE}=${json.token}`)
  })

  test("reuses an existing valid csrf cookie", async () => {
    const token = "a".repeat(64)
    const handler = createApiHandler({
      upstream: () => new Response("unused", { status: 500 })
    })
    const response = await handler(
      new Request("http://localhost/api/v1/csrf", {
        headers: { cookie: `${CSRF_COOKIE}=${token}` }
      })
    )
    const json = (await response.json()) as { token: string }
    expect(json.token).toBe(token)
  })

  test("bootstrap helper works for mutating routes", async () => {
    const handler = createApiHandler({
      upstream: () => new Response("unused", { status: 500 })
    })
    const csrf = await bootstrapCsrf(handler)
    expect(csrf.token).toHaveLength(64)
    expect(authorizedHeaders(csrf)[CSRF_HEADER]).toBe(csrf.token)
  })
})
