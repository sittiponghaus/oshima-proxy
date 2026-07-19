import { Effect, Schema } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http"

import {
  MapRequest,
  MapResponse,
  PropertyDetail,
  propertyContributeUrl,
  propertySourceUrl,
  type MapRequest as MapRequestType,
  type PropertyDetail as PropertyDetailType,
} from "./schema"

export class OshimaMapError extends Schema.TaggedErrorClass<OshimaMapError>()(
  "OshimaMapError",
  {
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

export class OshimaPropertyError extends Schema.TaggedErrorClass<OshimaPropertyError>()(
  "OshimaPropertyError",
  {
    message: Schema.String,
    cloudflare: Schema.optionalKey(Schema.Boolean),
    key: Schema.optionalKey(Schema.String),
    sourceUrl: Schema.optionalKey(Schema.String),
    contributeUrl: Schema.optionalKey(Schema.String),
    cause: Schema.optionalKey(Schema.Unknown),
  },
) {}

/** Browser client → local Bun proxy (`/api/map`) via Effect HttpClient */
export const fetchMapTiles = (body: MapRequestType) =>
  Effect.gen(function* () {
    const request = yield* HttpClientRequest.post("/api/map").pipe(
      HttpClientRequest.schemaBodyJson(MapRequest)(body),
      Effect.mapError(
        cause => new OshimaMapError({ message: "Failed to encode map request", cause }),
      ),
    )

    const response = yield* HttpClient.execute(request).pipe(
      Effect.mapError(
        cause => new OshimaMapError({ message: "Map request failed", cause }),
      ),
    )

    if (response.status < 200 || response.status >= 300) {
      return yield* new OshimaMapError({
        message: `Map proxy returned HTTP ${response.status}`,
      })
    }

    return yield* HttpClientResponse.schemaBodyJson(MapResponse)(response).pipe(
      Effect.mapError(
        cause =>
          new OshimaMapError({ message: "Map response failed schema check", cause }),
      ),
    )
  }).pipe(Effect.provide(FetchHttpClient.layer))

export const runFetchMapTiles = (body: MapRequestType) =>
  Effect.runPromise(fetchMapTiles(body))

/** Browser client → local Bun proxy (`/api/property/:key`) via Effect HttpClient */
export const fetchProperty = (key: string) =>
  Effect.gen(function* () {
    const encoded = encodeURIComponent(key)
    const response = yield* HttpClient.execute(
      HttpClientRequest.get(`/api/property/${encoded}`),
    ).pipe(
      Effect.mapError(
        cause =>
          new OshimaPropertyError({
            message: "Property request failed",
            key,
            sourceUrl: propertySourceUrl(key),
            contributeUrl: propertyContributeUrl(),
            cause,
          }),
      ),
    )

    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.json.pipe(
        Effect.orElseSucceed(() => null as unknown),
      )
      const record =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : null
      return yield* new OshimaPropertyError({
        message:
          typeof record?.error === "string"
            ? record.error
            : `Property proxy returned HTTP ${response.status}`,
        cloudflare: record?.cloudflare === true,
        key:
          typeof record?.key === "string"
            ? record.key
            : key,
        sourceUrl:
          typeof record?.sourceUrl === "string"
            ? record.sourceUrl
            : propertySourceUrl(key),
        contributeUrl:
          typeof record?.contributeUrl === "string"
            ? record.contributeUrl
            : propertyContributeUrl(),
      })
    }

    return yield* HttpClientResponse.schemaBodyJson(PropertyDetail)(response).pipe(
      Effect.mapError(
        cause =>
          new OshimaPropertyError({
            message: "Property response failed schema check",
            key,
            sourceUrl: propertySourceUrl(key),
            contributeUrl: propertyContributeUrl(),
            cause,
          }),
      ),
    )
  }).pipe(Effect.provide(FetchHttpClient.layer))

export const runFetchProperty = (
  key: string,
): Promise<PropertyDetailType> => Effect.runPromise(fetchProperty(key))
