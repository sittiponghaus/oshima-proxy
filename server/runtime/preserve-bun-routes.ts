/**
 * Effect's BunHttpServer reloads only `fetch`, which clears Bun HTML `routes`.
 *
 * Preserve SPA HTML + HMR; prefer Effect for `/api/v1/*`, otherwise SPA.
 * Exact `/favicon.svg` beats the SPA catch-all so the icon is not HTML.
 */
import index from "@/app/entrypoint.html"

type BunFetch = (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>

type ServeOptions = Parameters<typeof Bun.serve>[0] & {
  routes?: Record<string, unknown>
  development?: unknown
  fetch?: BunFetch
}

const originalServe = Bun.serve.bind(Bun)

const favicon = Bun.file(new URL("../../public/favicon.svg", import.meta.url))

const spaRoutes = (effectFetch: BunFetch) =>
  ({
    "/api/v1": effectFetch,
    "/api/v1/*": effectFetch,
    "/favicon.svg": favicon,
    "/*": index
  }) as const

;(Bun as typeof Bun).serve = ((options: ServeOptions) => {
  const initialFetch =
    options.fetch ?? ((_request: Request, _server: Bun.Server<unknown>) => new Response("not found", { status: 404 }))

  const server = originalServe({
    ...options,
    routes: {
      ...spaRoutes(initialFetch),
      ...(options.routes ?? {})
    }
  } as never)

  const originalReload = server.reload.bind(server)

  server.reload = ((next: ServeOptions | undefined) => {
    const effectFetch = (next?.fetch ?? initialFetch) as BunFetch
    return originalReload({
      ...(options as object),
      ...(next as object),
      routes: {
        ...spaRoutes(effectFetch),
        ...(options.routes ?? {}),
        ...(next?.routes ?? {})
      },
      development: next?.development ?? options.development,
      fetch: effectFetch
    } as never)
  }) as typeof server.reload

  return server
}) as typeof Bun.serve
