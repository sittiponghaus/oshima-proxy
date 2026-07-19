/**
 * Geolocation permission + position (types + atom handles for hooks).
 */
import * as geolocationRepository from "@/app/repository/geolocation.repository"
import type { UserLocation } from "@/app/repository/geolocation.repository"

export type { UserLocation }
export {
  LocationErrorReason,
  LocationPermissionError,
  RequestLocationState
} from "@/app/repository/geolocation.repository"

/** Atoms for React subscriptions (hooks only — not presentation). */
export const requestLocationStateAtom = geolocationRepository.requestLocationStateAtom
export const locationQueryOptionsAtom = geolocationRepository.locationQueryOptionsAtom
export const locationAtom = geolocationRepository.locationAtom
export const persistLocationAtom = geolocationRepository.persistLocationAtom

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation)
}

export function shouldShowLocationControl(requestState: geolocationRepository.RequestLocationState): boolean {
  return (
    requestState === geolocationRepository.RequestLocationState.NEVER_ASK ||
    requestState === geolocationRepository.RequestLocationState.NOT_ALLOWED ||
    requestState === geolocationRepository.RequestLocationState.ALLOWED
  )
}

/** Friendlier UI copy for TaggedError reasons. */
export function locationErrorCopy(error: geolocationRepository.LocationPermissionError): string {
  switch (error.reason) {
    case geolocationRepository.LocationErrorReason.Denied:
      return "Location access denied — check your browser settings"
    case geolocationRepository.LocationErrorReason.Unavailable:
      return "Your location couldn't be determined"
    case geolocationRepository.LocationErrorReason.Timeout:
      return "Location request timed out — try again"
    case geolocationRepository.LocationErrorReason.Unsupported:
      return "Not supported by this browser"
    default:
      return error.message
  }
}
