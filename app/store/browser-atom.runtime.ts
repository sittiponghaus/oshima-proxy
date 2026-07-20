/**
 * Shared Atom runtime for browser platform services.
 *
 * Provides `KeyValueStore` (localStorage) and `Geolocation` for store atoms.
 * Do not `Effect.provide` these layers inside individual atoms.
 */
import { BrowserKeyValueStore, Geolocation } from "@effect/platform-browser"
import { Layer } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"

export const BrowserAtomLayer = Layer.mergeAll(
  BrowserKeyValueStore.layerLocalStorage,
  Geolocation.layer
)

export const browserAtomRuntime = Atom.runtime(BrowserAtomLayer)
