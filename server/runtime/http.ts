import { CsrfRouteLive } from "@/server/controller/http/csrf.http"
import { MapRouteLive } from "@/server/controller/http/map.http"
import { PlaceRouteLive } from "@/server/controller/http/place.http"
import { PropertyRouteLive } from "@/server/controller/http/property.http"
import { ApiSecurityLive } from "@/server/runtime/security-middleware"
import { Layer } from "effect"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"

const ApiRoutesLive = Layer.mergeAll(CsrfRouteLive, MapRouteLive, PlaceRouteLive, PropertyRouteLive, ApiSecurityLive)

/** API routes + fetch HttpClient; Environment provided by Worker bindings. */
export const RoutesWithoutEnvLive = ApiRoutesLive.pipe(Layer.provideMerge(FetchHttpClient.layer))
