import { cacheControlFor, matchesIfNoneMatch, strongEtag, ttlMsFor, type RouteCacheKind } from "@/server/config/cache"
import { Effect } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

type CacheEntry = {
  readonly body: string
  readonly etag: string
  readonly expiresAt: number
}

const memory = new Map<string, CacheEntry>()

const cacheUrl = (key: string) => `https://ol-proxy.cache/${encodeURIComponent(key)}`

const toCacheRequest = (key: string) => new Request(cacheUrl(key), { method: "GET" })

const readMemory = (key: string): CacheEntry | null => {
  const hit = memory.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key)
    return null
  }
  return hit
}

const writeMemory = (key: string, entry: CacheEntry) => {
  memory.set(key, entry)
}

/** Clears in-process route cache (unit/integration tests). */
export const clearRouteCacheMemory = () => {
  memory.clear()
}

const hasCacheApi = () => typeof caches !== "undefined" && "default" in caches

const readEdge = Effect.fn("responseCache.readEdge")(function* (key: string) {
  if (!hasCacheApi()) return readMemory(key)
  const hit = yield* Effect.tryPromise({
    try: () => caches.default.match(toCacheRequest(key)),
    catch: () => null
  }).pipe(Effect.orElseSucceed(() => undefined))
  if (!hit || !hit.ok) return readMemory(key)

  const body = yield* Effect.tryPromise({
    try: () => hit.text(),
    catch: () => null
  }).pipe(Effect.orElseSucceed(() => null))
  if (body == null) return readMemory(key)

  const etagHeader = hit.headers.get("etag")
  const etag = etagHeader ?? (yield* strongEtag(body))
  const expiresHeader = hit.headers.get("x-ol-expires")
  const expiresAt = expiresHeader ? Number(expiresHeader) : Date.now()
  if (expiresAt <= Date.now()) return null
  return { body, etag, expiresAt } satisfies CacheEntry
})

const writeEdge = Effect.fn("responseCache.writeEdge")(function* (
  key: string,
  entry: CacheEntry,
  kind: RouteCacheKind
) {
  writeMemory(key, entry)
  if (!hasCacheApi()) return
  const maxAge = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000))
  yield* Effect.tryPromise({
    try: () =>
      caches.default.put(
        toCacheRequest(key),
        new Response(entry.body, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            etag: entry.etag,
            "cache-control": cacheControlFor(kind),
            "x-ol-expires": String(entry.expiresAt),
            "x-ol-cache-ttl": String(maxAge)
          }
        })
      ),
    catch: () => undefined
  }).pipe(Effect.ignore)
})

export const cacheKeyMap = (keys: readonly string[]) => `map:${[...keys].slice().sort().join(",")}`

export const cacheKeyReport = (key: string) => `report:${key}`

export const cacheKeyPlaceAutocomplete = (q: string) => `places:autocomplete:en:${q.trim().toLowerCase()}`

export const cacheKeyPlaceDetail = (placeId: string) => `places:details:en:${placeId.trim().toUpperCase()}`

const notModified = (etag: string, kind: RouteCacheKind) =>
  HttpServerResponse.empty({
    status: 304,
    headers: {
      etag,
      "cache-control": cacheControlFor(kind)
    }
  })

const jsonCached = (body: string, etag: string, kind: RouteCacheKind) =>
  HttpServerResponse.raw(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      etag,
      "cache-control": cacheControlFor(kind)
    }
  })

/**
 * Serve from edge/memory cache when possible (304 on matching If-None-Match),
 * otherwise run `load`, store JSON, and return with ETag + Cache-Control.
 */
export const withRouteCache = Effect.fn("responseCache.withRouteCache")(function* <E, R>(options: {
  readonly kind: RouteCacheKind
  readonly cacheKey: string
  readonly load: Effect.Effect<unknown, E, R>
}) {
  const request = yield* HttpServerRequest.HttpServerRequest
  const ifNoneMatch = request.headers["if-none-match"]

  const cached = yield* readEdge(options.cacheKey)

  if (cached) {
    if (matchesIfNoneMatch(ifNoneMatch, cached.etag)) {
      return notModified(cached.etag, options.kind)
    }
    return jsonCached(cached.body, cached.etag, options.kind)
  }

  const payload = yield* options.load
  const body = JSON.stringify(payload)
  const etag = yield* strongEtag(body).pipe(Effect.orElseSucceed(() => `"${body.length.toString(16)}"`))

  const entry: CacheEntry = {
    body,
    etag,
    expiresAt: Date.now() + ttlMsFor(options.kind)
  }

  yield* writeEdge(options.cacheKey, entry, options.kind)

  if (matchesIfNoneMatch(ifNoneMatch, etag)) {
    return notModified(etag, options.kind)
  }

  return jsonCached(body, etag, options.kind)
})
