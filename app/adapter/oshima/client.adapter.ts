import { ensureCsrfToken } from "@/app/http/csrf-client"
import { apiPath } from "@/shared/http/api"
import { CLIENT_HEADER, CLIENT_HEADER_VALUE, CSRF_HEADER } from "@/shared/http/security"
import {
  MapRequest,
  MapResponse,
  PropertyDetail,
  propertyContributeUrl,
  propertySourceUrl,
  type MapRequest as MapRequestType
} from "@/shared/oshima/schema"
import { Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
// CSRF Effect is composed here; `Effect.runPromise` belongs in app usecase.

export class OshimaMapError extends Schema.TaggedErrorClass<OshimaMapError>()("OshimaMapError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

export class OshimaPropertyError extends Schema.TaggedErrorClass<OshimaPropertyError>()("OshimaPropertyError", {
  message: Schema.String,
  cloudflare: Schema.optionalKey(Schema.Boolean),
  key: Schema.optionalKey(Schema.String),
  sourceUrl: Schema.optionalKey(Schema.String),
  contributeUrl: Schema.optionalKey(Schema.String),
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

const BrowserFetchLive = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, {
    credentials: "same-origin"
  } satisfies RequestInit)
)

const withCsrfHeaders = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function* () {
    const token = yield* ensureCsrfToken.pipe(
      Effect.mapError((cause) => new OshimaMapError({ message: "CSRF bootstrap failed", cause }))
    )
    return HttpClientRequest.setHeaders(request, {
      [CSRF_HEADER]: token,
      [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
      accept: "application/json"
    })
  })

/** Browser client → local proxy (`/api/v1/map`) via Effect HttpClient */
export const fetchMapTiles = (body: MapRequestType) =>
  Effect.gen(function* () {
    const encoded = yield* HttpClientRequest.post(apiPath("/map")).pipe(
      HttpClientRequest.schemaBodyJson(MapRequest)(body),
      Effect.mapError((cause) => new OshimaMapError({ message: "Failed to encode map request", cause }))
    )
    const request = yield* withCsrfHeaders(encoded).pipe(
      Effect.mapError((cause) =>
        cause instanceof OshimaMapError ? cause : new OshimaMapError({ message: "CSRF bootstrap failed", cause })
      )
    )

    const response = yield* HttpClient.execute(request).pipe(
      Effect.mapError((cause) => new OshimaMapError({ message: "Map request failed", cause }))
    )

    if (response.status < 200 || response.status >= 300) {
      return yield* new OshimaMapError({
        message: `Map proxy returned HTTP ${response.status}`
      })
    }

    return yield* HttpClientResponse.schemaBodyJson(MapResponse)(response).pipe(
      Effect.mapError((cause) => new OshimaMapError({ message: "Map response failed schema check", cause }))
    )
  }).pipe(Effect.provide(BrowserFetchLive))

/** Browser client → local proxy (`/api/v1/property/:key`) via Effect HttpClient */
export const fetchProperty = (key: string) =>
  Effect.gen(function* () {
    const encoded = encodeURIComponent(key)
    const base = HttpClientRequest.get(apiPath(`/property/${encoded}`))
    const request = yield* Effect.gen(function* () {
      const token = yield* ensureCsrfToken.pipe(
        Effect.mapError(
          (cause) =>
            new OshimaPropertyError({
              message: "CSRF bootstrap failed",
              key,
              sourceUrl: propertySourceUrl(key),
              contributeUrl: propertyContributeUrl(),
              cause
            })
        )
      )
      return HttpClientRequest.setHeaders(base, {
        [CSRF_HEADER]: token,
        [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
        accept: "application/json"
      })
    })

    const response = yield* HttpClient.execute(request).pipe(
      Effect.mapError(
        (cause) =>
          new OshimaPropertyError({
            message: "Property request failed",
            key,
            sourceUrl: propertySourceUrl(key),
            contributeUrl: propertyContributeUrl(),
            cause
          })
      )
    )

    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.json.pipe(Effect.orElseSucceed(() => null as unknown))
      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null
      return yield* new OshimaPropertyError({
        message: typeof record?.error === "string" ? record.error : `Property proxy returned HTTP ${response.status}`,
        cloudflare: record?.cloudflare === true,
        key: typeof record?.key === "string" ? record.key : key,
        sourceUrl: typeof record?.sourceUrl === "string" ? record.sourceUrl : propertySourceUrl(key),
        contributeUrl: typeof record?.contributeUrl === "string" ? record.contributeUrl : propertyContributeUrl()
      })
    }

    return yield* HttpClientResponse.schemaBodyJson(PropertyDetail)(response).pipe(
      Effect.mapError(
        (cause) =>
          new OshimaPropertyError({
            message: "Property response failed schema check",
            key,
            sourceUrl: propertySourceUrl(key),
            contributeUrl: propertyContributeUrl(),
            cause
          })
      )
    )
  }).pipe(Effect.provide(BrowserFetchLive))
