/**
 * Cloudflare Workers entry — Effect HttpRouter as a Web fetch handler.
 *
 * With `assets.run_worker_first: ["/api/*"]`, this only runs for API routes.
 * The SPA (including `/favicon.svg`) is served by Workers Assets from `dist/`.
 */
import { Layer } from "effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"

import {
  EnvironmentFromWorker,
  type WorkerEnvBindings,
} from "@/server/config/environment"
import { RoutesWithoutEnvLive } from "@/server/runtime/routes"

export type Env = WorkerEnvBindings

type WebHandler = (request: Request) => Promise<Response>

let handlerPromise: Promise<WebHandler> | undefined

const getHandler = (env: Env): Promise<WebHandler> => {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve().then(() => {
      const { handler } = HttpRouter.toWebHandler(
        RoutesWithoutEnvLive.pipe(Layer.provide(EnvironmentFromWorker(env))),
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
  },
}
