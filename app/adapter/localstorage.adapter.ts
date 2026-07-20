/**
 * Browser localStorage adapter.
 *
 * Sync helpers exist for Effect Atoms (`Result` callbacks) that cannot yield Effects.
 * Name declares the layer: `localStorageAdapter.*`.
 */
import { Effect } from "effect"

const getItem = (key: string) =>
  Effect.sync(() => {
    try {
      return localStorage.getItem(key) ?? undefined
    } catch {
      return undefined
    }
  })

const setItem = (key: string, value: string) =>
  Effect.sync(() => {
    localStorage.setItem(key, value)
  })

const removeItem = (key: string) =>
  Effect.sync(() => {
    localStorage.removeItem(key)
  })

/** Sync localStorage (for Atoms / Result stores). */
const getItemSync = (key: string): string | undefined => {
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

const setItemSync = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

const removeItemSync = (key: string): void => {
  localStorage.removeItem(key)
}

/** LocalStorage adapter surface — name declares the layer. */
export const localStorageAdapter = {
  getItem,
  setItem,
  removeItem,
  getItemSync,
  setItemSync,
  removeItemSync
} as const
