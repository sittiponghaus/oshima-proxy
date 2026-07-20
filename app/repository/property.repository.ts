/**
 * Property detail repository: HTTP adapter + wire→domain mapping.
 */
import { executeHttpAdapter, HttpClientRequest, HttpClientResponse, HttpError } from "@/app/adapter/http.adapter"
import { LoadStatus } from "@/app/config/load-status"
import { apiPath } from "@/shared/http/api"
import {
  PropertyDetail as PropertyDetailSchema,
  propertyContributeUrl as propertyContributeUrlFromSchema,
  propertySourceUrl as propertySourceUrlFromSchema,
  type MapMarker,
  type PropertyDetail
} from "@/shared/oshima/schema"
import { Effect, Schema } from "effect"

export type { MapMarker, PropertyDetail }

export class PropertyError extends Schema.TaggedErrorClass<PropertyError>()("PropertyError", {
  message: Schema.String,
  cloudflare: Schema.optionalKey(Schema.Boolean),
  key: Schema.optionalKey(Schema.String),
  sourceUrl: Schema.optionalKey(Schema.String),
  contributeUrl: Schema.optionalKey(Schema.String),
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

/** @deprecated Prefer PropertyError */
export const OshimaPropertyError = PropertyError

export type PropertyLoadError = {
  readonly status: typeof LoadStatus.Error
  readonly message: string
  readonly cloudflare: boolean
  readonly sourceUrl: string
  readonly contributeUrl: string
}

export function propertySourceUrl(key: string): string {
  return propertySourceUrlFromSchema(key)
}

export function propertyContributeUrl(): string {
  return propertyContributeUrlFromSchema()
}

const PropertyErrorBodySchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
  cloudflare: Schema.optionalKey(Schema.Boolean),
  key: Schema.optionalKey(Schema.String),
  sourceUrl: Schema.optionalKey(Schema.String),
  contributeUrl: Schema.optionalKey(Schema.String)
})

/** Fetch property detail (Effect). */
export const fetchProperty = Effect.fn("property.fetchProperty")(function* (key: string) {
  const encoded = encodeURIComponent(key)
  const base = HttpClientRequest.get(apiPath(`/property/${encoded}`))

  const response = yield* executeHttpAdapter(base).pipe(
    Effect.mapError(
      (cause) =>
        new PropertyError({
          message: cause instanceof HttpError ? cause.message : "Property request failed",
          key,
          sourceUrl: propertySourceUrl(key),
          contributeUrl: propertyContributeUrl(),
          cause
        })
    )
  )

  if (response.status < 200 || response.status >= 300) {
    const body = yield* response.json.pipe(Effect.orElseSucceed(() => null as unknown))
    const record = yield* Schema.decodeUnknownEffect(PropertyErrorBodySchema)(body ?? {}).pipe(
      Effect.orElseSucceed(() => ({}))
    )
    return yield* new PropertyError({
      message: record.error ?? `Property proxy returned HTTP ${response.status}`,
      cloudflare: record.cloudflare === true,
      key: record.key ?? key,
      sourceUrl: record.sourceUrl ?? propertySourceUrl(key),
      contributeUrl: record.contributeUrl ?? propertyContributeUrl()
    })
  }

  return yield* HttpClientResponse.schemaBodyJson(PropertyDetailSchema)(response).pipe(
    Effect.mapError(
      (cause) =>
        new PropertyError({
          message: "Property response failed schema check",
          key,
          sourceUrl: propertySourceUrl(key),
          contributeUrl: propertyContributeUrl(),
          cause
        })
    )
  )
})

/** Map a thrown cause into a presentation-ready error load state. */
export function mapPropertyLoadError(key: string, cause: unknown): PropertyLoadError {
  if (cause instanceof PropertyError) {
    return {
      status: LoadStatus.Error,
      message: cause.message,
      cloudflare: cause.cloudflare === true,
      sourceUrl: cause.sourceUrl ?? propertySourceUrl(key),
      contributeUrl: cause.contributeUrl ?? propertyContributeUrl()
    }
  }
  return {
    status: LoadStatus.Error,
    message: cause instanceof Error ? cause.message : String(cause),
    cloudflare: false,
    sourceUrl: propertySourceUrl(key),
    contributeUrl: propertyContributeUrl()
  }
}
