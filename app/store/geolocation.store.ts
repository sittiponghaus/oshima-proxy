import { localStorageAdapter } from "@/app/adapter/localstorage.adapter"
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

function getCurrentUserLocation(): Effect.Effect<UserLocation, LocationPermissionError> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Effect.fail(
      new LocationPermissionError({
        message: "Geolocation is not supported by this browser.",
        reason: LocationErrorReason.Unsupported
      })
    )
  }

  return Effect.callback<UserLocation, LocationPermissionError>((resume) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resume(
          Effect.succeed({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        )
      },
      (error) => {
        resume(Effect.fail(CreateLocationPermissionError(error)))
      },
      LocationRequestOptions
    )
  })
}

/**
 * Writable request-state atom (query + mutation).
 * Read: localStorage (or NEVER_ASK). Write: persist then update in-memory.
 */
export const requestLocationStateAtom: Atom.Writable<RequestLocationState> = Atom.writable(
  (): RequestLocationState => ReadStoredRequestLocationState(),
  (ctx, state: RequestLocationState) => {
    localStorageAdapter.setItemSync(RequestStateLocationLocalStorageKey, state)
    ctx.setSelf(state)
  }
).pipe(Atom.keepAlive)

/**
 * Controls whether the location atom fetches (TanStack `enabled` / `retry`).
 */
export const locationQueryOptionsAtom: Atom.Writable<LocationQueryOptions> = Atom.make<LocationQueryOptions>({
  enabled: false,
  retry: false
}).pipe(Atom.keepAlive)

/**
 * Location query atom: returns stored cache when disabled; otherwise
 * `getCurrentPosition`. Refresh is forced via `useAtomRefresh` / registry.refresh.
 * Automatic revalidation uses `Atom.swr` with staleTime ≈ 5 minutes.
 */
export const locationAtom: Atom.Atom<AsyncResult.AsyncResult<UserLocation | null, LocationPermissionError>> = Atom.make(
  (get): Effect.Effect<UserLocation | null, LocationPermissionError> => {
    const { enabled, retry } = get(locationQueryOptionsAtom)
    if (!enabled) {
      return Effect.succeed(ReadStoredLocation())
    }

    const fetch = getCurrentUserLocation()
    return retry ? fetch.pipe(Effect.retry({ times: 2 })) : fetch
  },
  { initialValue: ReadStoredLocation() }
).pipe(
  Atom.swr({
    staleTime: LOCATION_STALE_TIME,
    revalidateOnMount: true,
    revalidateOnFocus: true
  }),
  Atom.keepAlive
)

/**
 * Location mutation atom: persist to localStorage (TanStack setQueryData
 * equivalent is unnecessary — the locationAtom AsyncResult already holds the
 * fetched value; storage seeds the next cold read / disabled path).
 */
export const persistLocationAtom = Atom.fnSync((location: UserLocation) => {
  localStorageAdapter.setItemSync(LocationLocalStorageKey, JSON.stringify(location))
  return location
})

function ReadStoredRequestLocationState(): RequestLocationState {
  const item = localStorageAdapter.getItemSync(RequestStateLocationLocalStorageKey)
  return IsRequestLocationState(item) ? item : RequestLocationState.NEVER_ASK
}

function ReadStoredLocation(): UserLocation | null {
  const item = localStorageAdapter.getItemSync(LocationLocalStorageKey)
  if (!item) return null

  try {
    return JSON.parse(item) as UserLocation
  } catch {
    return null
  }
}

function IsRequestLocationState(input: string | null): input is RequestLocationState {
  return Object.values(RequestLocationState).some((state) => state === input)
}

function CreateLocationPermissionError(error: GeolocationPositionError): LocationPermissionError {
  if (error.code === error.PERMISSION_DENIED || error.code === 1) {
    return new LocationPermissionError({
      message: "Location access was denied by the user.",
      reason: LocationErrorReason.Denied,
      cause: error
    })
  }

  if (error.code === error.POSITION_UNAVAILABLE || error.code === 2) {
    return new LocationPermissionError({
      message: "Location information is unavailable.",
      reason: LocationErrorReason.Unavailable,
      cause: error
    })
  }

  if (error.code === error.TIMEOUT || error.code === 3) {
    return new LocationPermissionError({
      message: "Location request timed out.",
      reason: LocationErrorReason.Timeout,
      cause: error
    })
  }

  return new LocationPermissionError({
    message: "Unable to retrieve location.",
    reason: LocationErrorReason.Unknown,
    cause: error
  })
}
