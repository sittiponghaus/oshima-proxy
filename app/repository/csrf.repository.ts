/**
 * CSRF repository — `ApiHttp` auth bootstrap.
 */
import { ApiHttp } from "@/app/adapter/http.adapter"
import { Effect } from "effect"

/** Ensure CSRF cookie + in-memory token exist (idempotent). */
export const ensureCsrfToken = Effect.fn("csrf.ensureCsrfToken")(function* () {
  const http = yield* ApiHttp
  return yield* http.ensureToken()
})
