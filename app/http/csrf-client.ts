import { apiPath } from "@/app/config/http"
import { CLIENT_HEADER, CLIENT_HEADER_VALUE, CSRF_HEADER } from "@/shared/http/security"
import { Effect, Layer, Schema } from "effect"
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpMethod
} from "effect/unstable/http"

type CsrfState = {
  token: string
}

let state: CsrfState | null = null

/** Same-origin fetch defaults for browser → local `/api/v1/*` calls. */
const BrowserFetchLive = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, {
    credentials: "same-origin"
  } satisfies RequestInit)
)

const CsrfTokenResponse = Schema.Struct({
  token: Schema.String.check(Schema.isMinLength(32))
})

const headersRecord = (init?: HeadersInit): Record<string, string> => {
  const headers = new Headers(init)
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

/** Peek cached CSRF token without I/O (for usecase short-circuit). */
export const peekCsrfToken = (): string | null => state?.token ?? null

const fetchCsrfToken = Effect.gen(function* () {
  const request = HttpClientRequest.get(apiPath("/csrf"), {
    headers: {
      accept: "application/json",
      [CLIENT_HEADER]: CLIENT_HEADER_VALUE
    }
  })
  const response = yield* HttpClient.execute(request).pipe(
    Effect.mapError((cause) => new Error(`CSRF bootstrap failed`, { cause }))
  )
  if (response.status < 200 || response.status >= 300) {
    return yield* Effect.fail(new Error(`CSRF bootstrap failed (${response.status})`))
  }
  const body = yield* HttpClientResponse.schemaBodyJson(CsrfTokenResponse)(response).pipe(
    Effect.mapError(() => new Error("CSRF bootstrap returned an invalid token"))
  )
  state = { token: body.token }
  return body.token
}).pipe(Effect.provide(BrowserFetchLive))

/** Ensure a CSRF cookie + in-memory token exist (Effect — run in usecase). */
export const ensureCsrfToken = Effect.suspend(() => {
  if (state?.token) return Effect.succeed(state.token)
  return fetchCsrfToken
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

/** Same-origin API fetch with CSRF (Effect — run in usecase). */
export const apiFetch = (input: string | URL, init: RequestInit = {}) =>
  Effect.gen(function* () {
    const token = yield* ensureCsrfToken

    const headers = new Headers(init.headers)
    headers.set(CSRF_HEADER, token)
    headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE)
    if (!headers.has("accept")) {
      headers.set("accept", "application/json")
    }

    const methodRaw = (init.method ?? "GET").toUpperCase()
    if (!HttpMethod.isHttpMethod(methodRaw)) {
      return yield* Effect.fail(new Error(`Unsupported HTTP method: ${methodRaw}`))
    }

    let request = HttpClientRequest.make(methodRaw)(String(input), {
      headers: headersRecord(headers)
    })
    if (init.body != null) {
      request = attachBody(request, init.body)
    }

    const response = yield* HttpClient.execute(request).pipe(
      Effect.mapError((cause) => new Error(`API request failed`, { cause }))
    )
    const bytes = yield* response.arrayBuffer.pipe(
      Effect.mapError((cause) => new Error(`API response body failed`, { cause }))
    )
    return new Response(bytes, {
      status: response.status,
      headers: response.headers
    })
  }).pipe(Effect.provide(BrowserFetchLive))
