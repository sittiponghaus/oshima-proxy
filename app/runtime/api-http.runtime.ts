/**
 * Shared browser ManagedRuntime for API HTTP (CSRF token cache survives across runs).
 */
import { ApiHttp } from "@/app/adapter/http.adapter"
import { ManagedRuntime } from "effect"

export const ApiHttpRuntime = ManagedRuntime.make(ApiHttp.Live)
