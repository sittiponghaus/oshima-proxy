import { describe, expect, test } from "@effect/vitest"

import {
  LocationErrorReason,
  LocationPermissionError,
  RequestLocationState,
  isGeolocationSupported,
  locationErrorCopy,
  shouldShowLocationControl
} from "./geolocation.usecase"

describe("isGeolocationSupported", () => {
  test("reflects navigator.geolocation availability", () => {
    expect(typeof isGeolocationSupported()).toBe("boolean")
  })
})

describe("shouldShowLocationControl", () => {
  test("hides control only when unsupported", () => {
    expect(shouldShowLocationControl(RequestLocationState.NEVER_ASK)).toBe(true)
    expect(shouldShowLocationControl(RequestLocationState.NOT_ALLOWED)).toBe(true)
    expect(shouldShowLocationControl(RequestLocationState.ALLOWED)).toBe(true)
    expect(shouldShowLocationControl(RequestLocationState.UNSUPPORTED)).toBe(false)
  })
})

describe("locationErrorCopy", () => {
  const error = (reason: (typeof LocationErrorReason)[keyof typeof LocationErrorReason], message = "x") =>
    new LocationPermissionError({ message, reason })

  test("maps known reasons to friendly copy", () => {
    expect(locationErrorCopy(error(LocationErrorReason.Denied))).toContain("denied")
    expect(locationErrorCopy(error(LocationErrorReason.Unavailable))).toContain("couldn't be determined")
    expect(locationErrorCopy(error(LocationErrorReason.Timeout))).toContain("timed out")
    expect(locationErrorCopy(error(LocationErrorReason.Unsupported))).toContain("Not supported")
  })

  test("falls back to error message for unknown", () => {
    expect(locationErrorCopy(error(LocationErrorReason.Unknown, "weird"))).toBe("weird")
  })
})
