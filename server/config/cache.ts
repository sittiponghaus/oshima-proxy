import { Effect } from "effect"

/** Per-route TTL (seconds) for upstream response caching. */
export const ROUTE_CACHE_POLICY = {
  /** Oshimaland map tiles (`POST /api/v1/map`). */
  map: 60,
  /** Property / report detail (`GET /api/v1/property/:key`). */
  report: 60 * 60,
  /** Nominatim places autocomplete / details. */
  places: 5 * 60
} as const

export type RouteCacheKind = keyof typeof ROUTE_CACHE_POLICY

export const cacheControlFor = (kind: RouteCacheKind): string => {
  const maxAge = ROUTE_CACHE_POLICY[kind]
  return `public, max-age=${maxAge}, s-maxage=${maxAge}`
}

export const ttlMsFor = (kind: RouteCacheKind): number => ROUTE_CACHE_POLICY[kind] * 1000

/** Strong ETag from response body bytes (SHA-256 hex). */
export const strongEtag = Effect.fn("cache.strongEtag")(function* (body: string) {
  const digest = yield* Effect.tryPromise({
    try: () => crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
    catch: (cause) => cause
  })
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
  return `"${hex}"`
})

const stripWeak = (etag: string) => etag.trim().replace(/^W\//i, "").trim()

/** True if `If-None-Match` matches the given ETag (`*` or exact / list). */
export const matchesIfNoneMatch = (ifNoneMatch: string | undefined, etag: string): boolean => {
  if (!ifNoneMatch) return false
  const needle = stripWeak(etag)
  if (ifNoneMatch.trim() === "*") return true
  return ifNoneMatch.split(",").some((part) => stripWeak(part) === needle)
}
