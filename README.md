# oshima-proxy

OL Proxy — Cloudflare Workers + Effect API for Oshimaland map data, with a React CSR on OpenFreeMap.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React CSR)                                        │
│  component → container → usecase → repository → app/adapter │
└────────────────────────────┬────────────────────────────────┘
                             │ same-origin /api/v1/*
┌────────────────────────────▼────────────────────────────────┐
│  Worker (Effect HttpRouter)                                 │
│  security middleware → route adapters → upstream HTTP       │
│  shared/ schemas + cache keys                               │
└─────────────────────────────────────────────────────────────┘
```

### Layers

| Layer | Path | Role |
|-------|------|------|
| **Component** | `app/component/` | Pure UI — props in, events out. No repositories. |
| **Container** | `app/container/` | Wires hooks/atoms to usecases; owns screen state. |
| **Usecase** | `app/usecase/` | Domain orchestration; may map domain → container shape. |
| **Repository** | `app/repository/` | Wraps adapters; wire → domain mappers. |
| **Adapter (app)** | `app/adapter/` | Browser HTTP clients (never import `server/`). |
| **Atom / Hook** | `app/atom/`, `app/hook/` | Client state (Effect Atom) and React glue. |
| **Shared** | `shared/` | Contracts usable by both app and server (API paths, CSRF constants, Oshima schemas, quadkeys). |
| **Route adapter** | `server/adapter/` | Worker routes; upstream fetches; response shaping. |
| **Runtime** | `server/runtime/` | Router composition, CSRF/origin middleware, response cache. |
| **Config** | `server/config/`, `app/config/` | Env, cache TTLs, viewport defaults, site URLs. |
| **Entry** | `cmd/worker.ts`, `cmd/server.ts` | Workers fetch handler; optional Bun HMR server. |

**Hard boundary:** `app/` never imports `server/` (directly or via `@/server`). Enforce with `bun run check:boundaries` and `.cursor/rules/layer-boundaries.mdc`.

Data flow:

```
container ← usecase mapper (domain → container shape)
    ↑
usecase   ← calls repository only
    ↑
repository ← adapter + repository mapper (wire → domain)
    ↑
app/adapter or shared
```

### Runtime split

- **Production / `wrangler dev`:** `cmd/worker.ts` → `HttpRouter.toWebHandler` + Workers Assets (`dist/`). `assets.run_worker_first: ["/api/v1/*"]` so the Worker owns the API; the SPA is static assets.
- **Local Bun HMR (optional):** `bun run dev:bun` → `cmd/server.ts` (`BunHttpServer` + HTML HMR) for frontend iteration without Wrangler.

### API surface

| Method | Path | Upstream |
|--------|------|----------|
| `GET` | `/api/v1/csrf` | — (issues double-submit cookie + token) |
| `POST` | `/api/v1/map` | `api.oshimaland.co.jp/map` (batched quadkeys) |
| `GET` | `/api/v1/places/autocomplete?q=` | Nominatim search |
| `GET` | `/api/v1/places/details?placeId=` | Nominatim lookup (`N…` / `W…` / `R…`) |
| `GET` | `/api/v1/property/:key` | Oshimaland EN JSON, then JP fallback |

Property upstream order:

1. `https://www.oshimaland.com/d_en/{key}.json`
2. Fallback: `https://www.oshimaland.co.jp/d/{key}.json`

Default non-browser `User-Agent` avoids Cloudflare JS challenges. A browser-like `OSHIMA_USER_AGENT` without matching `OSHIMA_COOKIE` (`cf_clearance`) yields `502` with `{ cloudflare: true, sourceUrl, contributeUrl }`.

### Security

- **Same-origin only** — `Origin` / `Referer` must match the Worker origin; credentialed CORS.
- **CSRF** — cookie `ol_csrf` + header `x-csrf-token`; bootstrap via `GET /api/v1/csrf`. Required on all API routes except that bootstrap (and `OPTIONS`).
- **Client marker** — `x-ol-client: ol-proxy` on API calls.
- **CSP** — SPA via `public/_headers` (Workers Assets); API responses get `default-src 'none'` plus COOP/CORP/`nosniff`/frame deny.
- **Deploy version** — `CF_VERSION_METADATA` → response header `x-ol-deploy-version`.

### Caching

`withRouteCache` in `server/runtime/response-cache.ts` (Workers Cache API when available, else in-memory). Policy in `server/config/cache.ts`:

| Route | TTL |
|-------|-----|
| `POST /api/v1/map` | 60s |
| `GET /api/v1/property/:key` | 1h |
| Places autocomplete / details | 5m |

Strong `ETag` (SHA-256 of JSON). Matching `If-None-Match` → `304`.

## Stack

- **Runtime:** Cloudflare Workers (`effect` HttpRouter + `FetchHttpClient`)
- **SPA:** React 19 + MapLibre + OpenFreeMap (built into `dist/`)
- **Places:** OpenStreetMap Nominatim (no API key)
- **Tooling:** Bun, Wrangler, oxlint / oxfmt

## Setup

```bash
cp .env.example .env.local   # if present
bun install
bun run build
bun run dev                  # wrangler dev (Workers + assets)
# or
bun run dev:bun              # Bun HMR on :3000
```

### Deploy

```bash
bun run deploy
# Preview upload only (no production traffic / no multi-version split):
bun run deploy:version
# optional secrets when using a browser UA:
# wrangler secret put OSHIMA_COOKIE
# wrangler secret put OSHIMA_USER_AGENT
```

## Testing

Unit tests live **next to sources** as `*.test.ts`. Integration tests live under `test/integration/`.

```bash
bun test                 # all
bun run test:unit        # shared/ + server/ + app/
bun run test:integration # test/integration/*
```

| Kind | Location | What |
|------|----------|------|
| Unit | `shared/**/*.test.ts`, `server/**/*.test.ts`, `app/**/*.test.ts` | Pure helpers, schemas, mappers, usecase logic |
| Integration | `test/integration/*.test.ts` | In-process `HttpRouter` with stubbed upstream `HttpClient` |

Integration helpers (`test/integration/helpers/app-handler.ts`):

- Stub upstream via `HttpClient.make` + `HttpClientResponse.fromWeb`
- CSRF bootstrap (`bootstrapCsrf` + `authorizedHeaders`) for credentialed API calls
- Clears in-memory route cache between tests (`clearRouteCacheMemory`)

Also:

```bash
bun run check:boundaries   # app/ must not import server/
bun run fmt:check
```

## Repo layout (top level)

```
app/           React CSR (adapter → repository → usecase → container → component)
server/        Worker routes, middleware, cache, env
shared/        Cross-boundary contracts
cmd/           worker.ts (CF) · server.ts (Bun)
test/          integration/ only (unit tests are colocated)
public/        _headers for Workers Assets CSP
scripts/       check-boundaries.ts
```
