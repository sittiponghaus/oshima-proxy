import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { Environment, EnvironmentFromWorker, EnvironmentLive } from "./environment"

describe("EnvironmentFromWorker", () => {
  test("maps bindings into Environment, trimming blanks", async () => {
    const env = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* Environment
      }).pipe(
        Effect.provide(
          EnvironmentFromWorker({
            OSHIMA_COOKIE: "  cookie  ",
            OSHIMA_USER_AGENT: "   ",
            CF_VERSION_METADATA: {
              id: "vid",
              tag: "0.1.0",
              timestamp: "2026-01-01T00:00:00.000Z"
            }
          })
        )
      )
    )

    expect(env.port).toBe(0)
    expect(env.oshimaCookie).toBe("cookie")
    expect(env.oshimaUserAgent).toBeUndefined()
    expect(env.deployVersion).toEqual({
      id: "vid",
      tag: "0.1.0",
      timestamp: "2026-01-01T00:00:00.000Z"
    })
  })

  test("omits deployVersion when metadata is missing", async () => {
    const env = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* Environment
      }).pipe(Effect.provide(EnvironmentFromWorker({})))
    )
    expect(env.deployVersion).toBeUndefined()
  })
})

describe("EnvironmentLive", () => {
  afterEach(() => {
    delete process.env.PORT
    delete process.env.OSHIMA_COOKIE
    delete process.env.OSHIMA_USER_AGENT
  })

  test("defaults port and treats blank secrets as undefined", async () => {
    process.env.OSHIMA_COOKIE = "  "
    process.env.OSHIMA_USER_AGENT = "WorkerUA"
    const env = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* Environment
      }).pipe(Effect.provide(EnvironmentLive))
    )
    expect(env.port).toBe(3000)
    expect(env.oshimaCookie).toBeUndefined()
    expect(env.oshimaUserAgent).toBe("WorkerUA")
    expect(env.deployVersion).toBeUndefined()
  })
})
