import * as csrfRepository from "@/app/repository/csrf.repository"
/**
 * CSRF usecase: call repository + run Effect.
 */
import { Effect } from "effect"

let inflight: Promise<string> | null = null

/** Ensure a CSRF cookie + in-memory token exist (idempotent). */
export function bootstrapCsrf(): Promise<string> {
  const existing = csrfRepository.peekCsrfToken()
  if (existing) return Promise.resolve(existing)
  if (!inflight) {
    inflight = Effect.runPromise(csrfRepository.ensureCsrfToken).finally(() => {
      inflight = null
    })
  }
  return inflight
}
