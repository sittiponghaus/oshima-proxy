import { Environment, EnvironmentLive } from "@/server/config/environment"
import { RoutesLive } from "@/server/runtime/routes"
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer"
import { Effect, Layer } from "effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const env = yield* Environment
    yield* Effect.logInfo(`oshima-proxy → :${env.port} (Nominatim places)`)
    return HttpRouter.serve(RoutesLive).pipe(
      Layer.provide(
        BunHttpServer.layer({
          port: env.port,
          development: process.env.NODE_ENV !== "production" && {
            hmr: true,
            console: true
          }
        })
      )
    )
  })
).pipe(Layer.provide(EnvironmentLive))

export const MainLive = HttpServerLive

export const runMain = () => Layer.launch(MainLive)
