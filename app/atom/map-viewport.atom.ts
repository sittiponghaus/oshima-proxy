/**
 * Persists the map's last viewport (center + zoom) to localStorage so it can
 * be restored as the `initialViewState` on the next load. Decoupled from the
 * geolocation atoms, which persist the user's detected coordinates separately —
 * this only tracks where the map camera was left.
 */
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

/**
 * Writable viewport atom (query + mutation).
 * Read: localStorage (or null). Write: persist then update in-memory.
 */
export const mapViewportAtom: Atom.Writable<StoredViewport | null> = Atom.writable(
  (): StoredViewport | null => ReadStoredViewport(),
  (ctx, viewport: StoredViewport | null) => {
    if (viewport) {
      WriteLocalStorageItem(MapViewportLocalStorageKey, JSON.stringify(viewport))
    }
    ctx.setSelf(viewport)
  }
).pipe(Atom.keepAlive)

function ReadStoredViewport(): StoredViewport | null {
  const item = ReadLocalStorageItem(MapViewportLocalStorageKey)
  if (!item) return null

  try {
    const parsed = JSON.parse(item) as unknown
    return IsStoredViewport(parsed) ? parsed : null
  } catch {
    return null
  }
}

function IsStoredViewport(input: unknown): input is StoredViewport {
  if (typeof input !== "object" || input === null) return false
  const candidate = input as Record<string, unknown>
  return (
    typeof candidate.longitude === "number" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.zoom === "number"
  )
}

function ReadLocalStorageItem(key: string): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(key)
}

function WriteLocalStorageItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, value)
}
