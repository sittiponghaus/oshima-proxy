import "@/server/runtime/preserve-bun-routes.ts"
import { runMain } from "@/server/runtime/layer"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import { Effect } from "effect"

BunRuntime.runMain(runMain() as Effect.Effect<never, never>)
