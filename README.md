# oshima-proxy

OL Proxy — Cloudflare Workers + Effect proxy for Oshimaland map data, with a React CSR on OpenFreeMap.

## Stack

- **Runtime:** Cloudflare Workers (`HttpRouter.toWebHandler` + `FetchHttpClient`)
- **SPA assets:** Workers Assets (`dist/`, SPA fallback)
- **Local Bun (optional):** `bun run dev:bun` still runs `BunHttpServer` + HTML HMR for frontend iteration
- **Map:** MapLibre + OpenFreeMap
- **Places:** OpenStreetMap Nominatim (no API key)

## Caching

Upstream responses are cached (Workers Cache API when available, otherwise in-memory) using `ROUTE_CACHE_POLICY` in `server/config/cache.ts`:

| Route | TTL |
|-------|-----|
| `POST /api/v1/map` | 60s |
| `GET /api/v1/property/:key` | 1h |
| Places autocomplete / details | 5m |

Responses include a strong `ETag` (SHA-256 of the JSON body). Matching `If-None-Match` returns `304` without re-fetching the origin.

- **CORS:** same-origin only, credentialed (`Access-Control-Allow-Credentials`)
- **CSRF (CSR):** double-submit cookie `ol_csrf` + header `x-csrf-token`; bootstrap via `GET /api/v1/csrf`
- **Client marker:** `x-ol-client: ol-proxy` required on API calls (blocks simple form CSRF)
- **Origin check:** `Origin` / `Referer` must match the Worker origin
- **CSP (SPA):** `public/_headers` → Workers Assets; meta CSP in `app/entrypoint.html` for Bun HMR
- **CSP (API):** `default-src 'none'` plus COOP/CORP/`nosniff`/`DENY` frame options

## Setup

```bash
cp .env.example .env.local
bun install
bun run build
bun run dev          # wrangler dev (Workers + assets)
# or
bun run dev:bun      # Bun HMR server on :3000
```

Deploy:

```bash
bun run deploy
# versioned upload + traffic deploy (Gradual Deployments):
bun run deploy:version
# optional secrets:
# wrangler secret put OSHIMA_COOKIE
# wrangler secret put OSHIMA_USER_AGENT
```

## API

```http
POST /api/v1/map
Content-Type: application/json

{ "keys": ["032010110132"] }
```

```http
GET /api/v1/places/autocomplete?q=tokyo
GET /api/v1/places/details?placeId=N123
GET /api/v1/property/:key
```

Autocomplete returns suggestions with `lat`/`lng` so the UI can fly the map without a details roundtrip. Details uses Nominatim lookup by OSM id (`N…` / `W…` / `R…`).

Property detail proxies Oshimaland’s site JSON:

1. `GET https://www.oshimaland.com/d_en/{key}.json`
2. Fallback: `GET https://www.oshimaland.co.jp/d/{key}.json`

Upstream property JSON works **without** a Cloudflare cookie when the proxy uses a non-browser User-Agent (default `oshima-proxy/1.0`). A Chrome-like UA without `cf_clearance` gets a JS challenge.

On challenge failure the route returns `502` with `{ cloudflare: true, sourceUrl, contributeUrl }` (`sourceUrl` is `https://www.oshimaland.com/?p={key}`; posting on Oshimaland is in-map only via right-click).

### Optional cookie inject

Only needed if you set `OSHIMA_USER_AGENT` to a real browser UA:

```bash
# local Bun
OSHIMA_COOKIE='cf_clearance=…; …'
OSHIMA_USER_AGENT='Mozilla/5.0 …'

# Workers
wrangler secret put OSHIMA_COOKIE
wrangler secret put OSHIMA_USER_AGENT
```
