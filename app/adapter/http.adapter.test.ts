import { ApiHttp, HttpClientRequest } from "@/app/adapter/http.adapter"
import { apiPath } from "@/shared/http/api"
import { CSRF_HEADER } from "@/shared/http/security"
import { BrowserHttpClient } from "@effect/platform-browser"
import { Effect, Layer, ManagedRuntime } from "effect"
import { afterEach, describe, expect, it, vi } from "vitest"

const csrfPath = apiPath("/csrf")

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  })

const runtimeWithFetch = (fetchImpl: typeof globalThis.fetch) =>
  ManagedRuntime.make(
    Layer.mergeAll(ApiHttp.Live, Layer.succeed(BrowserHttpClient.Fetch, fetchImpl))
  )

describe("ApiHttp CSRF cache", () => {
  const originalLocation = globalThis.location

  afterEach(() => {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation
    })
    vi.restoreAllMocks()
  })

  const withBrowserOrigin = () => {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { origin: "http://localhost", pathname: "/" }
    })
  }

  it("single-flights concurrent ensureToken cold starts", async () => {
    withBrowserOrigin()
    let csrfCalls = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(csrfPath)) {
        csrfCalls += 1
        await new Promise((r) => setTimeout(r, 20))
        return jsonResponse({ token: "tok-shared" })
      }
      return jsonResponse({ ok: true })
    }) as typeof fetch

    const runtime = runtimeWithFetch(fetchImpl)
    try {
      const tokens = await runtime.runPromise(
        Effect.gen(function* () {
          const http = yield* ApiHttp
          return yield* Effect.all([http.ensureToken(), http.ensureToken(), http.ensureToken()], {
            concurrency: "unbounded"
          })
        })
      )
      expect(tokens).toEqual(["tok-shared", "tok-shared", "tok-shared"])
      expect(csrfCalls).toBe(1)
    } finally {
      await runtime.dispose()
    }
  })

  it("invalidates cached token and retries once on 403", async () => {
    withBrowserOrigin()
    let csrfCalls = 0
    let apiCalls = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes(csrfPath)) {
        csrfCalls += 1
        return jsonResponse({ token: csrfCalls === 1 ? "stale" : "fresh" })
      }
      apiCalls += 1
      const headers = new Headers(init?.headers)
      if (headers.get(CSRF_HEADER) === "stale") {
        return new Response(JSON.stringify({ error: "CSRF token missing or invalid" }), { status: 403 })
      }
      return jsonResponse({ ok: true })
    }) as typeof fetch

    const runtime = runtimeWithFetch(fetchImpl)
    try {
      const response = await runtime.runPromise(
        Effect.gen(function* () {
          const http = yield* ApiHttp
          return yield* http.execute(HttpClientRequest.get("/api/v1/map"))
        })
      )
      expect(response.status).toBe(200)
      expect(csrfCalls).toBe(2)
      expect(apiCalls).toBe(2)
    } finally {
      await runtime.dispose()
    }
  })

  it("builds a null body for 204 responses from fetch()", async () => {
    withBrowserOrigin()
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(csrfPath)) {
        return jsonResponse({ token: "tok" })
      }
      return new Response(null, { status: 204 })
    }) as typeof fetch

    const runtime = runtimeWithFetch(fetchImpl)
    try {
      const response = await runtime.runPromise(
        Effect.gen(function* () {
          const http = yield* ApiHttp
          return yield* http.fetch("/api/v1/map", { method: "POST" })
        })
      )
      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
    } finally {
      await runtime.dispose()
    }
  })
})
