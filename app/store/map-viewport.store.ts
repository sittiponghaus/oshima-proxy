/**
 * Persists the map's last viewport (center + zoom) via Effect `Atom.kvs` +
 * `BrowserKeyValueStore.layerLocalStorage` so it can be restored as the
 * `initialViewState` on the next load. Decoupled from the geolocation atoms,
 * which persist the user's detected coordinates separately — this only tracks
 * where the map camera was left.
 */
import { browserAtomRuntime } from "@/app/store/browser-atom.runtime"
import { Schema } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"

export interface StoredViewport {
  readonly longitude: number
  readonly latitude: number
  readonly zoom: number
}

export const mapViewportAtomKey = {
  all: () => ["map-viewport"] as const,
  viewport: () => [...mapViewportAtomKey.all(), "viewport"] as const
} as const

const MapViewportLocalStorageKey = `$atom-${mapViewportAtomKey.viewport().join("-")}`

const StoredViewportSchema = Schema.Struct({
  longitude: Schema.Number,
  latitude: Schema.Number,
  zoom: Schema.Number
})

/**
 * Writable viewport atom (query + mutation).
 * Backed by `KeyValueStore` via `Atom.kvs`.
 */
export const mapViewportAtom: Atom.Writable<StoredViewport | null> = Atom.kvs({
  runtime: browserAtomRuntime,
  key: MapViewportLocalStorageKey,
  schema: Schema.NullOr(StoredViewportSchema),
  defaultValue: () => null
}).pipe(Atom.keepAlive)
