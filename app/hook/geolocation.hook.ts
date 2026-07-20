import {
  LocationErrorReason,
  LocationPermissionError,
  RequestLocationState,
  isGeolocationSupported,
  locationAtom,
  locationErrorCopy,
  locationQueryOptionsAtom,
  persistLocationAtom,
  requestLocationStateAtom,
  shouldShowLocationControl,
  type UserLocation
} from "@/app/usecase/geolocation.usecase"
/**
 * React bindings for geolocation usecase (Effect Atom subscriptions).
 */
import { useAtom, useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Cause, Option, Predicate } from "effect"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { useCallback, useEffect, useLayoutEffect, useMemo } from "react"

export type { UserLocation }
export { LocationErrorReason, RequestLocationState, LocationPermissionError, locationErrorCopy }

function isLocationPermissionError(error: unknown): error is LocationPermissionError {
  return Predicate.isTagged(error, "LocationPermissionError")
}

/** Query-like read of persisted request permission state. */
export function useRequestLocationStateQuery() {
  return useAtomValue(requestLocationStateAtom)
}

/** Mutation-like write of request permission state (+ KeyValueStore). */
export function useRequestLocationStateMutation() {
  return useAtomSet(requestLocationStateAtom)
}

/**
 * Query-like location read. Mirrors TanStack `enabled` / `retry` by writing
 * `locationQueryOptionsAtom` then reading `locationAtom` (AsyncResult + swr).
 */
export function useLocationQuery(input: { readonly enabled: boolean; readonly retry: boolean }) {
  const [, setOptions] = useAtom(locationQueryOptionsAtom)
  const result = useAtomValue(locationAtom)
  const refresh = useAtomRefresh(locationAtom)

  useLayoutEffect(() => {
    setOptions({ enabled: input.enabled, retry: input.retry })
  }, [input.enabled, input.retry, setOptions])

  const data = useMemo(() => AsyncResult.getOrElse(result, (): UserLocation | null => null), [result])

  const error = useMemo((): LocationPermissionError | null => {
    if (!AsyncResult.isFailure(result)) return null
    const failure = Option.getOrNull(Cause.findErrorOption(result.cause))
    if (isLocationPermissionError(failure)) return failure
    return new LocationPermissionError({
      message: Cause.pretty(result.cause),
      reason: LocationErrorReason.Unknown,
      cause: failure ?? result.cause
    })
  }, [result])

  const isFetching = AsyncResult.isWaiting(result) || (AsyncResult.isInitial(result) && input.enabled)

  return {
    data,
    error,
    isFetching,
    isError: AsyncResult.isFailure(result),
    isSuccess: AsyncResult.isSuccess(result),
    refetch: refresh,
    result
  }
}

/** Mutation-like persist of a resolved location to KeyValueStore. */
export function useLocationMutation() {
  return useAtomSet(persistLocationAtom)
}

/**
 * Map-oriented helper: request permission, fetch location, surface errors.
 * Returns `location` so the caller can react (e.g. fly the map) without an effect callback.
 */
export function useUserGeolocation(options?: { readonly retry?: boolean }) {
  const requestState = useRequestLocationStateQuery()
  const setRequestState = useRequestLocationStateMutation()
  const persistLocation = useLocationMutation()

  const locationQuery = useLocationQuery({
    enabled: requestState === RequestLocationState.ALLOWED,
    retry: options?.retry ?? true
  })

  useEffect(() => {
    if (!locationQuery.data) return
    persistLocation(locationQuery.data)
  }, [locationQuery.data, persistLocation])

  useEffect(() => {
    if (!locationQuery.error) return

    if (locationQuery.error.reason === LocationErrorReason.Unsupported) {
      if (requestState !== RequestLocationState.UNSUPPORTED) {
        setRequestState(RequestLocationState.UNSUPPORTED)
      }
      return
    }

    if (locationQuery.error.reason === LocationErrorReason.Denied) {
      if (requestState !== RequestLocationState.NOT_ALLOWED) {
        setRequestState(RequestLocationState.NOT_ALLOWED)
      }
    }
  }, [locationQuery.error, requestState, setRequestState])

  const requestLocation = useCallback(() => {
    if (!isGeolocationSupported()) {
      setRequestState(RequestLocationState.UNSUPPORTED)
      return
    }

    if (requestState === RequestLocationState.ALLOWED) {
      locationQuery.refetch()
      return
    }

    setRequestState(RequestLocationState.ALLOWED)
  }, [locationQuery, requestState, setRequestState])

  return {
    requestState,
    location: locationQuery.data,
    error: locationQuery.error,
    isFetching: locationQuery.isFetching && requestState === RequestLocationState.ALLOWED,
    showControl: shouldShowLocationControl(requestState),
    requestLocation
  }
}
