/**
 * Property detail: wrap Oshima adapter + map errors / URLs for presentation.
 */
import { fetchProperty as fetchPropertyAdapter, OshimaPropertyError } from "@/app/adapter/oshima/client.adapter"
import { LoadStatus } from "@/app/config/load-status"
import {
  propertyContributeUrl as propertyContributeUrlAdapter,
  propertySourceUrl as propertySourceUrlAdapter,
  type MapMarker,
  type PropertyDetail
} from "@/shared/oshima/schema"

export type { MapMarker, PropertyDetail }
export { OshimaPropertyError }

export type PropertyLoadError = {
  readonly status: typeof LoadStatus.Error
  readonly message: string
  readonly cloudflare: boolean
  readonly sourceUrl: string
  readonly contributeUrl: string
}

export function propertySourceUrl(key: string): string {
  return propertySourceUrlAdapter(key)
}

export function propertyContributeUrl(): string {
  return propertyContributeUrlAdapter()
}

/** Fetch property detail (Effect). */
export const fetchProperty = (key: string) => fetchPropertyAdapter(key)

/** Map a thrown cause into a presentation-ready error load state. */
export function mapPropertyLoadError(key: string, cause: unknown): PropertyLoadError {
  if (cause instanceof OshimaPropertyError) {
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
