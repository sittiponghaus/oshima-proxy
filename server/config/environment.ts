import { Context, Effect, Layer } from "effect"
import * as Config from "effect/Config"

export class Environment extends Context.Service<
  Environment,
  {
    readonly port: number
    /** Optional Cookie when using a browser UA (e.g. `cf_clearance=…`). Not needed with default UA. */
    readonly oshimaCookie: string | undefined
    /** Optional UA override. Browser UAs need matching `OSHIMA_COOKIE`; default is non-browser. */
    readonly oshimaUserAgent: string | undefined
  }
>()("oshima/Environment") {}

export type WorkerEnvBindings = {
  readonly OSHIMA_COOKIE?: string
  readonly OSHIMA_USER_AGENT?: string
}

const optionalEnvString = (name: string) =>
  Config.string(name).pipe(
    Config.withDefault(""),
    Config.map(value => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }),
  )

const optionalBinding = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

/** Local Bun / process.env */
export const EnvironmentLive = Layer.effect(
  Environment,
  Effect.gen(function* () {
    const port = yield* Config.int("PORT").pipe(Config.withDefault(3000))
    const oshimaCookie = yield* optionalEnvString("OSHIMA_COOKIE")
    const oshimaUserAgent = yield* optionalEnvString("OSHIMA_USER_AGENT")
    return Environment.of({ port, oshimaCookie, oshimaUserAgent })
  }),
)

/** Cloudflare Workers vars / secrets */
export const EnvironmentFromWorker = (env: WorkerEnvBindings) =>
  Layer.succeed(
    Environment,
    Environment.of({
      port: 0,
      oshimaCookie: optionalBinding(env.OSHIMA_COOKIE),
      oshimaUserAgent: optionalBinding(env.OSHIMA_USER_AGENT),
    }),
  )
