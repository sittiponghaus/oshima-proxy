/**
 * Persists the map's last viewport (center + zoom) to localStorage so it can
 * be restored as the `initialViewState` on the next load. Decoupled from the
 * geolocation atoms (`app/atom/geolocation.ts`), which persist the user's
 * detected coordinates separately — this only tracks where the map camera
 * was left.
 */

export interface StoredViewport {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
}

const MapViewportLocalStorageKey = "oshima-proxy:map-viewport";

export function readStoredViewport(): StoredViewport | null {
  const item = ReadLocalStorageItem(MapViewportLocalStorageKey);
  if (!item) return null;

  try {
    const parsed = JSON.parse(item) as unknown;
    return IsStoredViewport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredViewport(viewport: StoredViewport): void {
  WriteLocalStorageItem(MapViewportLocalStorageKey, JSON.stringify(viewport));
}

function IsStoredViewport(input: unknown): input is StoredViewport {
  if (typeof input !== "object" || input === null) return false;
  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.longitude === "number" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.zoom === "number"
  );
}

function ReadLocalStorageItem(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

function WriteLocalStorageItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, value);
}
