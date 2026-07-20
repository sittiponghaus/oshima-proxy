/**
 * Geolocation permission + position (types + atom handles for hooks).
 */
import * as geolocationStore from "@/app/store/geolocation.store"
import type { UserLocation } from "@/app/store/geolocation.store"

export type { UserLocation }
export {
  LocationErrorReason,
  LocationPermissionError,
  RequestLocationState
} from "@/app/store/geolocation.store"

/** Atoms for React subscriptions (hooks only — not presentation). */
export const requestLocationStateAtom = geolocationStore.requestLocationStateAtom
export const locationQueryOptionsAtom = geolocationStore.locationQueryOptionsAtom
export const locationAtom = geolocationStore.locationAtom
export const persistLocationAtom = geolocationStore.persistLocationAtom

export function isGeolocationSupported(): boolean {
  return geolocationStore.isGeolocationSupported()
}

export function shouldShowLocationControl(requestState: geolocationStore.RequestLocationState): boolean {
  return (
    requestState === geolocationStore.RequestLocationState.NEVER_ASK ||
    requestState === geolocationStore.RequestLocationState.NOT_ALLOWED ||
    requestState === geolocationStore.RequestLocationState.ALLOWED
  )
}

/** Friendlier UI copy for TaggedError reasons. */
export function locationErrorCopy(error: geolocationStore.LocationPermissionError): string {
  switch (error.reason) {
    case geolocationStore.LocationErrorReason.Denied:
      return "Location access denied — check your browser settings"
    case geolocationStore.LocationErrorReason.Unavailable:
      return "Your location couldn't be determined"
    case geolocationStore.LocationErrorReason.Timeout:
      return "Location request timed out — try again"
    case geolocationStore.LocationErrorReason.Unsupported:
      return "Not supported by this browser"
    default:
      return error.message
  }
}
