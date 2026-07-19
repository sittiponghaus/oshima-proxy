# oshima-proxy

Local Bun + Effect (`@effect/platform-bun`) proxy for Oshimaland map tiles, with a React CSR on OpenFreeMap dark.

## Stack

- **Server:** `BunHttpServer` + `HttpRouter` + `BunHttpClient` / Effect `HttpClient`
- **SPA:** React CSR (Bun HTML HMR via `preserve-bun-routes`)
- **Map:** MapLibre + `https://tiles.openfreemap.org/styles/dark`
- **Places:** OpenStreetMap Nominatim (no API key)

## Setup

```bash
cp .env.example .env
bun install
bun run dev
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

Property detail proxies Oshimaland’s site JSON (Effect `HttpClient`):

1. `GET https://www.oshimaland.com/d_en/{key}.json`
2. Fallback: `GET https://www.oshimaland.co.jp/d/{key}.json`

The map host (`api.oshimaland.co.jp/map`) has **no** property-detail endpoint — confirmed from `static/pc.en.js` (`PROPERTY_DATA_DIR` + `fetch(\`${propertyDataDirectory}${key}.json\`)`).

Upstream property JSON works **without** a Cloudflare cookie when the proxy uses a non-browser User-Agent (default `oshima-proxy/1.0`, same idea as HTTPie). A Chrome-like UA without `cf_clearance` gets a JS challenge on Bun’s TLS stack — that was the previous failure mode.

On challenge failure the route returns `502` with `{ cloudflare: true, sourceUrl, contributeUrl }` (`sourceUrl` is `https://www.oshimaland.com/?p={key}`; `contributeUrl` is the Oshimaland homepage — posting is in-map only via right-click, not `/post_en`, which is a POST API and 404s on GET).

### Local cookie inject (optional)

Only needed if you set `OSHIMA_USER_AGENT` to a real browser UA. Then paste `Cookie` (at least `cf_clearance`) from that same browser session:

```bash
OSHIMA_COOKIE='cf_clearance=…; …'
OSHIMA_USER_AGENT='Mozilla/5.0 …'
```

Restart `bun run dev`. Cookies expire; this is a manual local-dev aid only. Photos at `static.oshimaland.co.jp` may still be CF-gated.
