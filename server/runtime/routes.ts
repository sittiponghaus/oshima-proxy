import { Layer } from "effect"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"

import { MapRouteLive } from "@/server/adapter/map-route"
import { PlacesRouteLive } from "@/server/adapter/places-route"
import { PropertyRouteLive } from "@/server/adapter/property-route"
import { EnvironmentLive } from "@/server/config/environment"

const ApiRoutesLive = Layer.mergeAll(
  MapRouteLive,
  PlacesRouteLive,
  PropertyRouteLive,
)

/** API routes + fetch HttpClient + process.env Environment (Bun). */
export const RoutesLive = ApiRoutesLive.pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(EnvironmentLive),
)

/** API routes + fetch HttpClient; Environment provided by Worker bindings. */
export const RoutesWithoutEnvLive = ApiRoutesLive.pipe(
  Layer.provideMerge(FetchHttpClient.layer),
)
