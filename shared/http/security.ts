/** Shared CORS, CSP, CSRF, and security header values. */

export const CSRF_COOKIE = "ol_csrf"
export const CSRF_HEADER = "x-csrf-token"
/** Client marker — browsers cannot set this on simple cross-site form posts. */
export const CLIENT_HEADER = "x-ol-client"
export const CLIENT_HEADER_VALUE = "ol-proxy"

export const CORS = {
  allowedMethods: ["GET", "HEAD", "POST", "OPTIONS"] as const,
  allowedHeaders: ["content-type", "accept", CSRF_HEADER, CLIENT_HEADER] as const,
  maxAge: 86_400,
  credentials: true
} as const

/** Tight policy for JSON API responses (not documents). */
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

export const API_SECURITY_HEADERS = {
  "content-security-policy": API_CONTENT_SECURITY_POLICY,
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin"
} as const

export const generateCsrfToken = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Constant-time equality for equal-length hex tokens. */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
