# oshima-proxy

OL Proxy — Cloudflare Workers + Effect proxy for Oshimaland map data, with a React CSR on OpenFreeMap.

## Stack

- **Runtime:** Cloudflare Workers (`HttpRouter.toWebHandler` + `FetchHttpClient`)
- **SPA assets:** Workers Assets (`dist/`, SPA fallback)
- **Local Bun (optional):** `bun run dev:bun` still runs `BunHttpServer` + HTML HMR for frontend iteration
- **Map:** MapLibre + OpenFreeMap
- **Places:** OpenStreetMap Nominatim (no API key)

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
# optional secrets:
# wrangler secret put OSHIMA_COOKIE
# wrangler secret put OSHIMA_USER_AGENT
```

## API

```http
POST /api/map
Content-Type: application/json

{ "keys": ["032010110132"] }
```

```http
GET /api/places/autocomplete?q=tokyo
GET /api/places/details?placeId=N123
GET /api/property/:key
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
