/**
 * Geolocation permission + position atoms.
 *
 * Persistence: `Atom.kvs` via `browserAtomRuntime` (localStorage KeyValueStore).
 * Position reads: `Geolocation` from the same Atom runtime (no local provide).
 */
import { browserAtomRuntime } from "@/app/store/browser-atom.runtime"
import { Geolocation } from "@effect/platform-browser"
import { Effect, Schema } from "effect"
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"

export interface UserLocation {
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
}

export const LocationErrorReason = {
  Unsupported: "unsupported",
  Denied: "denied",
  Unavailable: "unavailable",
  Timeout: "timeout",
  Unknown: "unknown"
} as const
export type LocationErrorReason = (typeof LocationErrorReason)[keyof typeof LocationErrorReason]

export class LocationPermissionError extends Schema.TaggedErrorClass<LocationPermissionError>()(
  "LocationPermissionError",
  {
    message: Schema.String,
    reason: Schema.Literals([
      LocationErrorReason.Unsupported,
      LocationErrorReason.Denied,
      LocationErrorReason.Unavailable,
      LocationErrorReason.Timeout,
      LocationErrorReason.Unknown
    ]),
    cause: Schema.optionalKey(Schema.Unknown)
  }
) {}

export const RequestLocationState = {
  NEVER_ASK: "never-asked",
  NOT_ALLOWED: "not-allowed",
  ALLOWED: "allowed",
  UNSUPPORTED: "unsupported"
} as const
export type RequestLocationState = (typeof RequestLocationState)[keyof typeof RequestLocationState]

export const geolocationAtomKey = {
  all: () => ["geolocation"] as const,
  requestState: () => [...geolocationAtomKey.all(), "request-state"] as const,
  location: () => [...geolocationAtomKey.all(), "location"] as const
} as const

const RequestStateLocationLocalStorageKey = `$atom-${geolocationAtomKey.requestState().join("-")}`
const LocationLocalStorageKey = `$atom-${geolocationAtomKey.location().join("-")}`

const RequestLocationStateSchema = Schema.Literals([
  RequestLocationState.NEVER_ASK,
  RequestLocationState.NOT_ALLOWED,
  RequestLocationState.ALLOWED,
  RequestLocationState.UNSUPPORTED
])

const UserLocationSchema = Schema.Struct({
  latitude: Schema.Number,
  longitude: Schema.Number,
  accuracy: Schema.Number
})

const LocationRequestOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0
}

/** ~5 min staleTime equivalent via Atom.swr */
export const LOCATION_STALE_TIME = "5 minutes" as const

export type LocationQueryOptions = {
  readonly enabled: boolean
  readonly retry: boolean
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation)
}

function getCurrentUserLocation(): Effect.Effect<
  UserLocation,
  LocationPermissionError,
  Geolocation.Geolocation
> {
  if (!isGeolocationSupported()) {
    return Effect.fail(
      new LocationPermissionError({
        message: "Geolocation is not supported by this browser.",
        reason: LocationErrorReason.Unsupported
      })
    )
  }

  return Geolocation.Geolocation.use((geo) =>
    geo.getCurrentPosition(LocationRequestOptions).pipe(
      Effect.map((position) => ({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      })),
      Effect.mapError(mapGeolocationError)
    )
  )
}

function mapGeolocationError(error: Geolocation.GeolocationError): LocationPermissionError {
  switch (error.reason._tag) {
    case "PermissionDenied":
      return new LocationPermissionError({
        message: "Location access was denied by the user.",
        reason: LocationErrorReason.Denied,
        cause: error
      })
    case "PositionUnavailable":
      return new LocationPermissionError({
        message: "Location information is unavailable.",
        reason: LocationErrorReason.Unavailable,
        cause: error
      })
    case "Timeout":
      return new LocationPermissionError({
        message: "Location request timed out.",
        reason: LocationErrorReason.Timeout,
        cause: error
      })
    default:
      return new LocationPermissionError({
        message: "Unable to retrieve location.",
        reason: LocationErrorReason.Unknown,
        cause: error
      })
  }
}

/**
 * Writable request-state atom (query + mutation).
 * Backed by `KeyValueStore` via `Atom.kvs`.
 */
export const requestLocationStateAtom: Atom.Writable<RequestLocationState> = Atom.kvs({
  runtime: browserAtomRuntime,
  key: RequestStateLocationLocalStorageKey,
  schema: RequestLocationStateSchema,
  defaultValue: () => RequestLocationState.NEVER_ASK
}).pipe(Atom.keepAlive)

/**
 * Controls whether the location atom fetches (TanStack `enabled` / `retry`).
 */
export const locationQueryOptionsAtom: Atom.Writable<LocationQueryOptions> = Atom.make<LocationQueryOptions>({
  enabled: false,
  retry: false
}).pipe(Atom.keepAlive)

/**
 * Persisted last-known location (`Atom.kvs`). Also used as the write target for
 * `persistLocationAtom` / `useLocationMutation`.
 */
export const persistLocationAtom: Atom.Writable<UserLocation | null> = Atom.kvs({
  runtime: browserAtomRuntime,
  key: LocationLocalStorageKey,
  schema: Schema.NullOr(UserLocationSchema),
  defaultValue: () => null
}).pipe(Atom.keepAlive)

/**
 * Location query atom: returns stored cache when disabled; otherwise
 * `Geolocation.getCurrentPosition` via `browserAtomRuntime`.
 */
export const locationAtom: Atom.Atom<AsyncResult.AsyncResult<UserLocation | null, LocationPermissionError>> =
  browserAtomRuntime
    .atom((get): Effect.Effect<UserLocation | null, LocationPermissionError, Geolocation.Geolocation> => {
      const { enabled, retry } = get(locationQueryOptionsAtom)
      if (!enabled) {
        return Effect.succeed(get(persistLocationAtom))
      }

      const fetch = getCurrentUserLocation()
      return retry ? fetch.pipe(Effect.retry({ times: 2 })) : fetch
    }, { initialValue: null })
    .pipe(
      Atom.swr({
        staleTime: LOCATION_STALE_TIME,
        revalidateOnMount: true,
        revalidateOnFocus: true
      }),
      Atom.keepAlive
    )
