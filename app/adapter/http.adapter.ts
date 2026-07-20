/**
 * Browser HTTP adapter — Effect `Context.Service` + Layer DI.
 *
 * Transport: `BrowserHttpClient.layerFetch`.
 * App policy: CSRF bootstrap (Ref-cached token, single-flight) + client headers.
 *
 * Provide `ApiHttp.Live` at the runtime edge (see `ApiHttpRuntime`), not inside
 * individual calls. Repositories `yield* ApiHttp`.
 */
import { apiPath } from "@/shared/http/api"
import { CLIENT_HEADER, CLIENT_HEADER_VALUE, CSRF_HEADER } from "@/shared/http/security"
import { BrowserHttpClient } from "@effect/platform-browser"
import { Context, Effect, Layer, Ref, Schema, Semaphore } from "effect"
import * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as HttpMethod from "effect/unstable/http/HttpMethod"

export class HttpError extends Schema.TaggedErrorClass<HttpError>()("HttpError", {
  message: Schema.String,
  status: Schema.optionalKey(Schema.Number),
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

const AuthTokenResponse = Schema.Struct({
  token: Schema.String
})

/** Fetch statuses that must not carry a body (Fetch Living Standard). */
const isNullBodyStatus = (status: number) =>
  status === 101 || status === 103 || status === 204 || status === 205 || status === 304

const isAuthFailureStatus = (status: number) => status === 401 || status === 403

const headersRecord = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

const attachBody = (
  request: HttpClientRequest.HttpClientRequest,
  body: BodyInit
): HttpClientRequest.HttpClientRequest => {
  if (typeof body === "string") {
    return HttpClientRequest.bodyText(request, body)
  }
  if (body instanceof FormData) {
    return HttpClientRequest.bodyFormData(request, body)
  }
  if (body instanceof Uint8Array) {
    return HttpClientRequest.bodyUint8Array(request, body)
  }
  if (body instanceof URLSearchParams) {
    return HttpClientRequest.bodyText(request, body.toString(), "application/x-www-form-urlencoded")
  }
  return HttpClientRequest.setBody(request, HttpBody.raw(body))
}

const withAuthHeaders = (request: HttpClientRequest.HttpClientRequest, token: string) =>
  HttpClientRequest.setHeaders(request, {
    [CSRF_HEADER]: token,
    [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
    accept: "application/json"
  })

/**
 * Same-origin API client with CSRF auth.
 *
 * Yield with `yield* ApiHttp`; provide `ApiHttp.Live` (via `ApiHttpRuntime`) at
 * the UI / test edge.
 */
export class ApiHttp extends Context.Service<
  ApiHttp,
  {
    readonly ensureToken: () => Effect.Effect<string, HttpError>
    readonly execute: (
      request: HttpClientRequest.HttpClientRequest
    ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpError>
    readonly fetch: (input: string | URL, init?: RequestInit) => Effect.Effect<Response, HttpError>
  }
>()("ApiHttp") {
  static readonly Live: Layer.Layer<ApiHttp> = Layer.effect(
    ApiHttp,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const tokenRef = yield* Ref.make<string | undefined>(undefined)
      const bootstrap = yield* Semaphore.make(1)

      const fetchCsrfToken = Effect.fn("ApiHttp.fetchCsrfToken")(function* () {
        const request = HttpClientRequest.get(apiPath("/csrf"), {
          headers: {
            accept: "application/json",
            [CLIENT_HEADER]: CLIENT_HEADER_VALUE
          }
        })
        const response = yield* client.execute(request).pipe(
          Effect.mapError((cause) => new HttpError({ message: "Auth bootstrap failed", cause }))
        )
        if (response.status < 200 || response.status >= 300) {
          return yield* new HttpError({
            message: `Auth bootstrap failed (${response.status})`,
            status: response.status
          })
        }
        const body = yield* HttpClientResponse.schemaBodyJson(AuthTokenResponse)(response).pipe(
          Effect.mapError(
            (cause) => new HttpError({ message: "Auth bootstrap returned an invalid token", cause })
          )
        )
        yield* Ref.set(tokenRef, body.token)
        return body.token
      })

      const ensureToken = Effect.fn("ApiHttp.ensureToken")(function* () {
        const cached = yield* Ref.get(tokenRef)
        if (cached !== undefined) return cached

        return yield* bootstrap.withPermit(
          Effect.gen(function* () {
            const again = yield* Ref.get(tokenRef)
            if (again !== undefined) return again
            return yield* fetchCsrfToken()
          })
        )
      })

      /** Clear cache only if it still holds the token that failed (avoid racing a fresher refresh). */
      const invalidateToken = (used: string) =>
        Ref.update(tokenRef, (cached) => (cached === used ? undefined : cached))

      const executeWithToken = (request: HttpClientRequest.HttpClientRequest, token: string) =>
        client.execute(withAuthHeaders(request, token)).pipe(
          Effect.mapError((cause) => new HttpError({ message: "HTTP request failed", cause }))
        )

      const execute = Effect.fn("ApiHttp.execute")(function* (request: HttpClientRequest.HttpClientRequest) {
        const token = yield* ensureToken()
        const response = yield* executeWithToken(request, token)
        if (!isAuthFailureStatus(response.status)) return response

        yield* invalidateToken(token)
        const fresh = yield* ensureToken()
        if (fresh === token) return response
        return yield* executeWithToken(request, fresh)
      })

      const fetchOnce = Effect.fn("ApiHttp.fetchOnce")(function* (
        input: string | URL,
        init: RequestInit,
        token: string
      ) {
        const headers = new Headers(init.headers)
        headers.set(CSRF_HEADER, token)
        headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE)
        if (!headers.has("accept")) {
          headers.set("accept", "application/json")
        }

        const methodRaw = (init.method ?? "GET").toUpperCase()
        if (!HttpMethod.isHttpMethod(methodRaw)) {
          return yield* new HttpError({ message: `Unsupported HTTP method: ${methodRaw}` })
        }

        let request = HttpClientRequest.make(methodRaw)(String(input), {
          headers: headersRecord(headers)
        })
        if (init.body != null) {
          request = attachBody(request, init.body)
        }

        const response = yield* client.execute(request).pipe(
          Effect.mapError((cause) => new HttpError({ message: "API request failed", cause }))
        )
        const bytes = yield* response.arrayBuffer.pipe(
          Effect.mapError((cause) => new HttpError({ message: "API response body failed", cause }))
        )
        return new Response(isNullBodyStatus(response.status) ? null : bytes, {
          status: response.status,
          headers: response.headers
        })
      })

      const fetch = Effect.fn("ApiHttp.fetch")(function* (input: string | URL, init: RequestInit = {}) {
        const token = yield* ensureToken()
        const response = yield* fetchOnce(input, init, token)
        if (!isAuthFailureStatus(response.status)) return response

        yield* invalidateToken(token)
        const fresh = yield* ensureToken()
        if (fresh === token) return response
        return yield* fetchOnce(input, init, fresh)
      })

      return {
        ensureToken,
        execute,
        fetch
      }
    })
  ).pipe(Layer.provide(BrowserHttpClient.layerFetch))
}

/** Decode JSON body with a schema after a successful status check. */
export const decodeJsonAdapter = <A, I>(
  response: HttpClientResponse.HttpClientResponse,
  schema: Schema.Codec<A, I>,
  onStatus: (status: number) => HttpError = (status) => new HttpError({ message: `HTTP ${status}`, status })
) =>
  Effect.gen(function* () {
    if (response.status < 200 || response.status >= 300) {
      return yield* onStatus(response.status)
    }
    return yield* HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(
        (cause) => new HttpError({ message: "Response failed schema check", cause, status: response.status })
      )
    )
  })

/** Live layer — compose into `ManagedRuntime` / app layers. */
export { HttpClientRequest, HttpClientResponse }
