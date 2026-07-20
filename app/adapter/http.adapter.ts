/**
 * HTTP adapter for same-origin API calls (Effect HttpClient).
 *
 * Owns the CSRF auth provider (cookie + in-memory token). Repositories call
 * `executeHttpAdapter` / `apiFetchAdapter`; containers/entrypoint run Effects
 * via `Effect.runPromise` at the React boundary.
 */
import { FetchHttpClient, HttpBody, HttpClient, HttpClientRequest, HttpClientResponse, HttpMethod } from "effect/unstable/http"
import { Data, Effect, Schema } from "effect"
import { apiPath } from "@/shared/http/api"
import { CLIENT_HEADER, CLIENT_HEADER_VALUE, CSRF_HEADER } from "@/shared/http/security"

export class HttpError extends Data.TaggedError("HttpError")<{
  readonly message: string
  readonly status?: number
  readonly cause?: unknown
}> {}

const AuthTokenResponse = Schema.Struct({
  token: Schema.String
})

type AuthState = { token: string }

let authState: AuthState | null = null

const HttpLiveAdapter = FetchHttpClient.layer

const headersRecord = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

/** Peek cached auth token without I/O (usecase short-circuit). */
export const peekAuthTokenAdapter = (): string | null => authState?.token ?? null

const fetchAuthTokenAdapter = Effect.gen(function* () {
  const request = HttpClientRequest.get(apiPath("/csrf"), {
    headers: {
      accept: "application/json",
      [CLIENT_HEADER]: CLIENT_HEADER_VALUE
    }
  })
  const response = yield* HttpClient.execute(request).pipe(
    Effect.mapError((cause) => new HttpError({ message: "Auth bootstrap failed", cause }))
  )
  if (response.status < 200 || response.status >= 300) {
    return yield* new HttpError({
      message: `Auth bootstrap failed (${response.status})`,
      status: response.status
    })
  }
  const body = yield* HttpClientResponse.schemaBodyJson(AuthTokenResponse)(response).pipe(
    Effect.mapError((cause) => new HttpError({ message: "Auth bootstrap returned an invalid token", cause }))
  )
  authState = { token: body.token }
  return body.token
}).pipe(Effect.provide(HttpLiveAdapter))

/** Ensure auth cookie + in-memory token exist (Effect — run at the UI edge). */
export const ensureAuthTokenAdapter = Effect.suspend(() => {
  if (authState?.token) return Effect.succeed(authState.token)
  return fetchAuthTokenAdapter
})

/** Attach this provider's authorization headers to a request. */
export const withAuthAdapter = Effect.fn("http.withAuthAdapter")(function* (
  request: HttpClientRequest.HttpClientRequest
) {
  const token = yield* ensureAuthTokenAdapter
  return HttpClientRequest.setHeaders(request, {
    [CSRF_HEADER]: token,
    [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
    accept: "application/json"
  })
})

/** Execute an Effect HttpClient request with auth (standard entry for repositories). */
export const executeHttpAdapter = Effect.fn("http.executeHttpAdapter")(function* (
  request: HttpClientRequest.HttpClientRequest
) {
  const authed = yield* withAuthAdapter(request).pipe(
    Effect.mapError((cause) =>
      cause instanceof HttpError ? cause : new HttpError({ message: "Auth bootstrap failed", cause })
    )
  )
  return yield* HttpClient.execute(authed).pipe(
    Effect.mapError((cause) => new HttpError({ message: "HTTP request failed", cause }))
  )
}, Effect.provide(HttpLiveAdapter))

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

/**
 * Same-origin fetch returning a web `Response` (places autocomplete, etc.).
 * Prefer `executeHttpAdapter` + schema decode when the wire type is known.
 */
export const apiFetchAdapter = Effect.fn("http.apiFetchAdapter")(function* (
  input: string | URL,
  init: RequestInit = {}
) {
  const token = yield* ensureAuthTokenAdapter

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

  const response = yield* HttpClient.execute(request).pipe(
    Effect.mapError((cause) => new HttpError({ message: "API request failed", cause }))
  )
  const bytes = yield* response.arrayBuffer.pipe(
    Effect.mapError((cause) => new HttpError({ message: "API response body failed", cause }))
  )
  return new Response(bytes, {
    status: response.status,
    headers: response.headers
  })
}, Effect.provide(HttpLiveAdapter))

export { HttpClientRequest, HttpClientResponse, HttpLiveAdapter }
