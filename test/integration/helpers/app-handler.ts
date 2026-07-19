/**
 * In-process API handler with a stub upstream HttpClient.
 */
import { Environment } from "@/server/config/environment"
import { CsrfRouteLive } from "@/server/adapter/csrf-route"
import { MapRouteLive } from "@/server/adapter/map-route"
import { PlacesRouteLive } from "@/server/adapter/places-route"
import { PropertyRouteLive } from "@/server/adapter/property-route"
import { ApiSecurityLive } from "@/server/runtime/security-middleware"
import { CLIENT_HEADER, CLIENT_HEADER_VALUE, CSRF_COOKIE, CSRF_HEADER } from "@/shared/http/security"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse, HttpRouter } from "effect/unstable/http"
import type { HttpClientRequest } from "effect/unstable/http"

export type UpstreamHandler = (request: HttpClientRequest.HttpClientRequest) => Response | Promise<Response>

export const createStubHttpClientLayer = (handler: UpstreamHandler) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: async () => handler(request),
          catch: (cause) => cause as Error
        }).pipe(Effect.orDie)
        return HttpClientResponse.fromWeb(request, response)
      })
    )
  )

export const createTestEnvLayer = (
  overrides: Partial<{
    oshimaCookie: string | undefined
    oshimaUserAgent: string | undefined
    deployVersion: { id: string; tag: string; timestamp: string } | undefined
  }> = {}
) =>
  Layer.succeed(
    Environment,
    Environment.of({
      port: 0,
      oshimaCookie: overrides.oshimaCookie,
      oshimaUserAgent: overrides.oshimaUserAgent,
      deployVersion: overrides.deployVersion
    })
  )

export const createApiHandler = (options: {
  readonly upstream: UpstreamHandler
  readonly env?: Parameters<typeof createTestEnvLayer>[0]
}) => {
  const app = Layer.mergeAll(
    CsrfRouteLive,
    MapRouteLive,
    PlacesRouteLive,
    PropertyRouteLive,
    ApiSecurityLive
  ).pipe(
    Layer.provideMerge(createStubHttpClientLayer(options.upstream)),
    Layer.provideMerge(createTestEnvLayer(options.env))
  )
  return HttpRouter.toWebHandler(app).handler
}

export const bootstrapCsrf = async (handler: (request: Request) => Promise<Response>) => {
  const response = await handler(new Request("http://localhost/api/v1/csrf"))
  const json = (await response.json()) as { token: string; header: string }
  const setCookie = response.headers.getSetCookie?.() ?? []
  const cookieHeader =
    setCookie.length > 0
      ? setCookie.map((part) => part.split(";")[0]!).join("; ")
      : `${CSRF_COOKIE}=${json.token}`
  return { token: json.token, cookieHeader, headerName: json.header || CSRF_HEADER }
}

export const authorizedHeaders = (csrf: { token: string; cookieHeader: string; headerName: string }) => ({
  origin: "http://localhost",
  [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
  [csrf.headerName]: csrf.token,
  cookie: csrf.cookieHeader,
  accept: "application/json"
})
