import { describe, expect, test } from "@effect/vitest"

import {
  API_SECURITY_HEADERS,
  CLIENT_HEADER,
  CLIENT_HEADER_VALUE,
  CSRF_COOKIE,
  CSRF_HEADER,
  generateCsrfToken,
  timingSafeEqual
} from "./security"

describe("generateCsrfToken", () => {
  test("returns 64-char lowercase hex", () => {
    const token = generateCsrfToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  test("produces unique tokens", () => {
    const a = generateCsrfToken()
    const b = generateCsrfToken()
    expect(a).not.toBe(b)
  })
})

describe("timingSafeEqual", () => {
  test("matches equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true)
    expect(timingSafeEqual("", "")).toBe(true)
  })

  test("rejects unequal content of same length", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false)
  })

  test("rejects different lengths without comparing contents", () => {
    expect(timingSafeEqual("a", "aa")).toBe(false)
    expect(timingSafeEqual("token", "")).toBe(false)
  })
})

describe("security constants", () => {
  test("exposes CSRF and client markers used by middleware", () => {
    expect(CSRF_COOKIE).toBe("ol_csrf")
    expect(CSRF_HEADER).toBe("x-csrf-token")
    expect(CLIENT_HEADER).toBe("x-ol-client")
    expect(CLIENT_HEADER_VALUE).toBe("ol-proxy")
  })

  test("API security headers include a tight CSP", () => {
    expect(API_SECURITY_HEADERS["content-security-policy"]).toContain("default-src 'none'")
    expect(API_SECURITY_HEADERS["x-frame-options"]).toBe("DENY")
  })
})
