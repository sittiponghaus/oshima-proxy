import { describe, expect, test } from "@effect/vitest"
import { Effect } from "effect"

import { Environment, EnvironmentFromWorker } from "./environment"

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
