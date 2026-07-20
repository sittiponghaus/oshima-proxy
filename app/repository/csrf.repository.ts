/**
 * CSRF repository — thin facade over the HTTP adapter's auth provider.
 * Usecase runs Effects; UI never imports the adapter directly.
 */
export {
  ensureAuthTokenAdapter as ensureCsrfToken,
  peekAuthTokenAdapter as peekCsrfToken
} from "@/app/adapter/http.adapter"
