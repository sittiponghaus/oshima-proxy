/** Shared async load lifecycle for map tiles, property panel, etc. */
export const LoadStatus = {
  Idle: "idle",
  Loading: "loading",
  Error: "error",
  Ready: "ready"
} as const

export type LoadStatus = ValueOf<typeof LoadStatus>
