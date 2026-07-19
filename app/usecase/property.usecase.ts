/**
 * Property detail usecase: call repository + run Effect.
 */
import { LoadStatus } from "@/app/config/load-status"
import * as propertyRepository from "@/app/repository/property.repository"
import type { MapMarker, PropertyDetail, PropertyLoadError } from "@/app/repository/property.repository"
import { Effect } from "effect"

export type { MapMarker, PropertyDetail, PropertyLoadError }
export { OshimaPropertyError } from "@/app/repository/property.repository"

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

export function loadPropertyDetail(key: string): Promise<PropertyDetail> {
  return Effect.runPromise(propertyRepository.fetchProperty(key))
}

export function propertyLoadErrorFromCause(key: string, cause: unknown): PropertyLoadError {
  return propertyRepository.mapPropertyLoadError(key, cause)
}
