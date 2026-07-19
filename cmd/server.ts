import "@/server/runtime/preserve-bun-routes.ts"

import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import { Effect } from "effect"

import { runMain } from "@/server/runtime/layer"

BunRuntime.runMain(runMain() as Effect.Effect<never, never>)
