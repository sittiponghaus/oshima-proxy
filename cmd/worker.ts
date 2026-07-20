import { EnvironmentFromWorker, type WorkerEnvBindings } from "@/server/config/environment"
import { RoutesWithoutEnvLive } from "@/server/runtime/http"
/**
 * Cloudflare Workers entry — Effect HttpRouter as a Web fetch handler.
 *
 * With `assets.run_worker_first: ["/api/v1/*"]`, this only runs for API routes.
 * The SPA (`/`, `/robots.txt`, hashed JS/CSS) is served by Workers Assets from `dist/`.
 * Early Hints (103) come from `Link: rel=preload|modulepreload|preconnect` in `dist/_headers`
 * when Early Hints is enabled on the Cloudflare zone — not from this Worker.
 */
import { Layer } from "effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"

export type Env = WorkerEnvBindings

type WebHandler = (request: Request) => Promise<Response>

let handlerPromise: Promise<WebHandler> | undefined

const getHandler = (env: Env): Promise<WebHandler> => {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve().then(() => {
      // provideMerge keeps Environment in runtime context for global middleware.
      const { handler } = HttpRouter.toWebHandler(
        RoutesWithoutEnvLive.pipe(Layer.provideMerge(EnvironmentFromWorker(env)))
      )
      return (request: Request) => handler(request)
    })
  }
  return handlerPromise
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const handler = await getHandler(env)
    return handler(request)
  }
}
