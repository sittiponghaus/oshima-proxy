/**
 * Geolocation persistence + browser Geolocation API (via Effect Atoms).
 */
export {
  LOCATION_STALE_TIME,
  LocationErrorReason,
  LocationPermissionError,
  RequestLocationState,
  geolocationAtomKey,
  locationAtom,
  locationQueryOptionsAtom,
  persistLocationAtom,
  requestLocationStateAtom,
  type LocationQueryOptions,
  type UserLocation
} from "@/app/atom/geolocation.atom"
