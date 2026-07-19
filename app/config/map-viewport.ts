/**
 * Initial map camera when nothing is persisted in localStorage.
 * Centered on Tokyo for a Japan-focused viewer.
 */
export const DEFAULT_VIEW_STATE = {
  longitude: 139.6917,
  latitude: 35.6895,
  zoom: 11
} as const
