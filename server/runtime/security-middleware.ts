import { Environment } from "@/server/config/environment"
import { API_BASE, apiPath } from "@/shared/http/api"
import {
  API_SECURITY_HEADERS,
  CLIENT_HEADER,
  CLIENT_HEADER_VALUE,
  CORS,
  CSRF_COOKIE,
  CSRF_HEADER,
  timingSafeEqual
} from "@/shared/http/security"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

const jsonForbidden = (error: string) => HttpServerResponse.jsonUnsafe({ error }, { status: 403 })

const requestSelfOrigin = (request: HttpServerRequest.HttpServerRequest) =>
  Option.match(HttpServerRequest.toURL(request), {
    onNone: () => null as string | null,
    onSome: (url) => url.origin
  })

const requestPathname = (request: HttpServerRequest.HttpServerRequest) => {
  const path = request.url.split("?")[0] ?? request.url
  return path.startsWith("/") ? path : `/${path}`
}

const isSameOrigin = (request: HttpServerRequest.HttpServerRequest): boolean => {
  const selfOrigin = requestSelfOrigin(request)
  if (!selfOrigin) return false

  const origin = request.headers["origin"]
  if (origin) return origin === selfOrigin

  const referer = request.headers["referer"]
  if (referer) {
    try {
      return new URL(referer).origin === selfOrigin
    } catch {
      return false
    }
  }

  return request.method === "GET" || request.method === "HEAD"
}

const csrfExempt = (method: string, pathname: string) =>
  method === "OPTIONS" || (method === "GET" && pathname === apiPath("/csrf"))

const sameOriginCors = <E, R>(httpApp: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const selfOrigin = requestSelfOrigin(request)
    const origin = request.headers["origin"]
    const allowOrigin =
      selfOrigin && origin === selfOrigin
        ? {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            vary: "Origin"
          }
        : undefined

    if (request.method === "OPTIONS") {
      return HttpServerResponse.empty({
        status: 204,
        headers: {
          ...allowOrigin,
          "access-control-allow-methods": CORS.allowedMethods.join(", "),
          "access-control-allow-headers": CORS.allowedHeaders.join(", "),
          "access-control-max-age": String(CORS.maxAge)
        }
      })
    }

    const response = yield* httpApp
    return allowOrigin ? HttpServerResponse.setHeaders(response, allowOrigin) : response
  })

const withCsrfAndOrigin = <E, R>(httpApp: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const pathname = requestPathname(request)

    if (!pathname.startsWith(API_BASE)) {
      return yield* httpApp
    }

    if (!isSameOrigin(request)) {
      return jsonForbidden("Origin not allowed")
    }

    if (!csrfExempt(request.method, pathname)) {
      const client = request.headers[CLIENT_HEADER]
      if (client !== CLIENT_HEADER_VALUE) {
        return jsonForbidden("Missing client header")
      }

      const cookieToken = request.cookies[CSRF_COOKIE]
      const headerToken = request.headers[CSRF_HEADER]
      if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
        return jsonForbidden("CSRF token missing or invalid")
      }
    }

    return yield* httpApp
  })

const withApiSecurityHeaders = <E, R>(httpApp: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
  Effect.gen(function* () {
    const response = yield* httpApp
    return HttpServerResponse.setHeaders(response, API_SECURITY_HEADERS)
  })

/** Attach Worker deploy version id when `CF_VERSION_METADATA` is bound. */
const withDeployVersionHeader = <E, R>(httpApp: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
  Effect.gen(function* () {
    const response = yield* httpApp
    const { deployVersion } = yield* Environment
    if (!deployVersion) return response
    return HttpServerResponse.setHeader(response, "x-ol-deploy-version", deployVersion.id)
  })

/**
 * Same-origin CORS (credentialed) + Origin/CSRF checks + API hardening headers.
 */
export const ApiSecurityLive = Layer.mergeAll(
  HttpRouter.middleware(withApiSecurityHeaders, { global: true }),
  HttpRouter.middleware(withDeployVersionHeader, { global: true }),
  HttpRouter.middleware(withCsrfAndOrigin, { global: true }),
  HttpRouter.middleware(sameOriginCors, { global: true })
)
