/** Versioned API base path (no trailing slash). */
export const API_BASE = "/api/v1"

export const apiPath = (path: string) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
