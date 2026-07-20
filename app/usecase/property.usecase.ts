/**
 * Property detail usecase — Effect programs; run at the UI edge.
 */
import { LoadStatus } from "@/app/config/load-status"
import * as propertyRepository from "@/app/repository/property.repository"
import type { MapMarker, PropertyDetail, PropertyLoadError } from "@/app/repository/property.repository"
import { Effect } from "effect"

export type { MapMarker, PropertyDetail, PropertyLoadError }
export { PropertyError, OshimaPropertyError } from "@/app/repository/property.repository"

export type PropertyLoadState =
  | { status: typeof LoadStatus.Loading }
  | { status: typeof LoadStatus.Ready; detail: PropertyDetail }
  | PropertyLoadError

export function propertySourceUrl(key: string): string {
  return propertyRepository.propertySourceUrl(key)
}

export function propertyContributeUrl(): string {
  return propertyRepository.propertyContributeUrl()
}

export const loadPropertyDetail = Effect.fn("usecase.loadPropertyDetail")(function* (key: string) {
  return yield* propertyRepository.fetchProperty(key)
})

export function propertyLoadErrorFromCause(key: string, cause: unknown): PropertyLoadError {
  return propertyRepository.mapPropertyLoadError(key, cause)
}
