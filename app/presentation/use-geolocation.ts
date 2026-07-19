import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useAtom, useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Cause, Option, Predicate } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import {
  LocationErrorReason,
  LocationPermissionError,
  locationAtom,
  locationQueryOptionsAtom,
  persistLocationAtom,
  RequestLocationState,
  requestLocationStateAtom,
  type UserLocation,
} from "../atom/geolocation";

export type { UserLocation } from "../atom/geolocation";
export { LocationErrorReason, RequestLocationState, LocationPermissionError };

function isLocationPermissionError(error: unknown): error is LocationPermissionError {
  return Predicate.isTagged(error, "LocationPermissionError");
}

/** Query-like read of persisted request permission state. */
export function useRequestLocationStateQuery() {
  return useAtomValue(requestLocationStateAtom);
}

/** Mutation-like write of request permission state (+ localStorage). */
export function useRequestLocationStateMutation() {
  return useAtomSet(requestLocationStateAtom);
}

/**
 * Query-like location read. Mirrors TanStack `enabled` / `retry` by writing
 * `locationQueryOptionsAtom` then reading `locationAtom` (AsyncResult + swr).
 */
export function useLocationQuery(input: { readonly enabled: boolean; readonly retry: boolean }) {
  const [, setOptions] = useAtom(locationQueryOptionsAtom);
  const result = useAtomValue(locationAtom);
  const refresh = useAtomRefresh(locationAtom);

  useLayoutEffect(() => {
    setOptions({ enabled: input.enabled, retry: input.retry });
  }, [input.enabled, input.retry, setOptions]);

  const data = useMemo(
    () => AsyncResult.getOrElse(result, (): UserLocation | null => null),
    [result],
  );

  const error = useMemo((): LocationPermissionError | null => {
    if (!AsyncResult.isFailure(result)) return null;
    const failure = Option.getOrNull(Cause.findErrorOption(result.cause));
    if (isLocationPermissionError(failure)) return failure;
    return new LocationPermissionError({
      message: Cause.pretty(result.cause),
      reason: LocationErrorReason.Unknown,
      cause: failure ?? result.cause,
    });
  }, [result]);

  const isFetching =
    AsyncResult.isWaiting(result) || (AsyncResult.isInitial(result) && input.enabled);

  return {
    data,
    error,
    isFetching,
    isError: AsyncResult.isFailure(result),
    isSuccess: AsyncResult.isSuccess(result),
    refetch: refresh,
    result,
  };
}

/** Mutation-like persist of a resolved location to localStorage. */
export function useLocationMutation() {
  return useAtomSet(persistLocationAtom);
}

/**
 * Map-oriented helper: request permission, fetch location, surface errors.
 * Calls `onLocated` when ALLOWED and a location is available (once per coords).
 */
export function useUserGeolocation(options?: {
  readonly onLocated?: (location: UserLocation) => void;
  readonly retry?: boolean;
}) {
  const requestState = useRequestLocationStateQuery();
  const setRequestState = useRequestLocationStateMutation();
  const persistLocation = useLocationMutation();
  const onLocatedRef = useRef(options?.onLocated);
  onLocatedRef.current = options?.onLocated;
  const lastFlownKeyRef = useRef<string | null>(null);

  const locationQuery = useLocationQuery({
    enabled: requestState === RequestLocationState.ALLOWED,
    retry: options?.retry ?? true,
  });

  useEffect(() => {
    if (!locationQuery.data) return;
    persistLocation(locationQuery.data);
  }, [locationQuery.data, persistLocation]);

  useEffect(() => {
    if (requestState !== RequestLocationState.ALLOWED) return;
    if (!locationQuery.data) return;
    if (locationQuery.isFetching) return;

    const key = `${locationQuery.data.latitude},${locationQuery.data.longitude}`;
    if (lastFlownKeyRef.current === key) return;
    lastFlownKeyRef.current = key;
    onLocatedRef.current?.(locationQuery.data);
  }, [requestState, locationQuery.data, locationQuery.isFetching]);

  useEffect(() => {
    if (!locationQuery.error) return;

    if (locationQuery.error.reason === LocationErrorReason.Unsupported) {
      if (requestState !== RequestLocationState.UNSUPPORTED) {
        setRequestState(RequestLocationState.UNSUPPORTED);
      }
      return;
    }

    if (locationQuery.error.reason === LocationErrorReason.Denied) {
      if (requestState !== RequestLocationState.NOT_ALLOWED) {
        setRequestState(RequestLocationState.NOT_ALLOWED);
      }
    }
  }, [locationQuery.error, requestState, setRequestState]);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setRequestState(RequestLocationState.UNSUPPORTED);
      return;
    }

    lastFlownKeyRef.current = null;

    if (requestState === RequestLocationState.ALLOWED) {
      locationQuery.refetch();
      return;
    }

    setRequestState(RequestLocationState.ALLOWED);
  }, [locationQuery, requestState, setRequestState]);

  const showControl =
    requestState === RequestLocationState.NEVER_ASK ||
    requestState === RequestLocationState.NOT_ALLOWED ||
    requestState === RequestLocationState.ALLOWED;

  return {
    requestState,
    location: locationQuery.data,
    error: locationQuery.error,
    isFetching: locationQuery.isFetching && requestState === RequestLocationState.ALLOWED,
    showControl,
    requestLocation,
  };
}
