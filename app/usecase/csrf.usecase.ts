/**
 * CSRF usecase — Effect program; run via `ApiHttpRuntime` at the UI edge.
 */
import * as csrfRepository from "@/app/repository/csrf.repository"
import { Effect } from "effect"

/** Ensure a CSRF cookie + in-memory token exist (idempotent). */
export const bootstrapCsrf = Effect.fn("usecase.bootstrapCsrf")(function* () {
  return yield* csrfRepository.ensureCsrfToken()
})
