import { SearchBoxView } from "@/app/component/search-box.component"
import {
  resolvePlaceSelection,
  searchPlace,
  shouldSearchPlace,
  type PlaceResult,
  type PlaceSuggestion
} from "@/app/usecase/place.usecase"
import { useDebounce } from "@uidotdev/usehooks"
import { Effect } from "effect"
import { useCallback, useEffect, useId, useRef, useState } from "react"

export type { PlaceResult, PlaceSuggestion }

type Props = {
  readonly onSelect: (place: PlaceResult) => void
}

/** Places search logic — calls usecase only. */
export function SearchBox({ onSelect }: Props) {
  const listId = useId()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 350)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shouldSearchPlace(debouncedQuery)) {
      setSuggestions([])
      setError(null)
      return
    }

    let cancelled = false
    setBusy(true)
    setError(null)

    void Effect.runPromise(searchPlace(debouncedQuery))
      .then((next) => {
        if (cancelled) return
        setSuggestions(next)
        setOpen(true)
        setActive(0)
      })
      .catch((cause) => {
        if (cancelled) return
        setSuggestions([])
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    return () => document.removeEventListener("pointerdown", onPointer)
  }, [])

  const choose = useCallback(
    (suggestion: PlaceSuggestion) => {
      setQuery(suggestion.mainText || suggestion.label)
      setOpen(false)
      setError(null)
      setBusy(true)
      void Effect.runPromise(resolvePlaceSelection(suggestion))
        .then((place) => {
          onSelect(place)
        })
        .catch((cause) => {
          setError(cause instanceof Error ? cause.message : String(cause))
        })
        .finally(() => {
          setBusy(false)
        })
    },
    [onSelect]
  )

  const clear = useCallback(() => {
    setQuery("")
    setSuggestions([])
    setOpen(false)
    setError(null)
    inputRef.current?.focus()
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && open && suggestions.length > 0) {
        event.preventDefault()
        setActive((i) => (i + 1) % suggestions.length)
      } else if (event.key === "ArrowUp" && open && suggestions.length > 0) {
        event.preventDefault()
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
      } else if (event.key === "Enter" && open && suggestions.length > 0) {
        event.preventDefault()
        const pick = suggestions[active]
        if (pick) void choose(pick)
      } else if (event.key === "Escape") {
        if (open) {
          setOpen(false)
        } else if (query.length > 0) {
          clear()
        }
      }
    },
    [active, choose, clear, open, query.length, suggestions]
  )

  return (
    <SearchBoxView
      listId={listId}
      query={query}
      suggestions={suggestions}
      open={open}
      busy={busy}
      error={error}
      active={active}
      wrapRef={wrapRef}
      inputRef={inputRef}
      onQueryChange={setQuery}
      onOpen={() => {
        if (suggestions.length > 0) setOpen(true)
      }}
      onClear={clear}
      onChoose={(suggestion) => void choose(suggestion)}
      onActiveChange={setActive}
      onKeyDown={onKeyDown}
    />
  )
}
