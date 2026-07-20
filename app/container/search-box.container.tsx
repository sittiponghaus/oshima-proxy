import { SearchBoxView } from "@/app/component/search-box.component"
import {
  ensurePlaceSelectionQueryData,
  placeSearchQueryOptions
} from "@/app/query/domain.query"
import { shouldSearchPlace, type PlaceResult, type PlaceSuggestion } from "@/app/usecase/place.usecase"
import { useQuery } from "@tanstack/react-query"
import { useDebounce } from "@uidotdev/usehooks"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"

export type { PlaceResult, PlaceSuggestion }

type Props = {
  readonly onSelect: (place: PlaceResult) => void
}

/** Places search logic — TanStack Query + ensureQueryData for selection. */
export function SearchBox({ onSelect }: Props) {
  const listId = useId()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 350)
  const [open, setOpen] = useState(false)
  const [selectionBusy, setSelectionBusy] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchQuery = useQuery(placeSearchQueryOptions(debouncedQuery))
  const suggestions = useMemo(
    () => (shouldSearchPlace(debouncedQuery) ? (searchQuery.data ?? []) : []),
    [debouncedQuery, searchQuery.data]
  )
  const busy = searchQuery.isFetching || selectionBusy
  const error =
    selectionError ??
    (searchQuery.isError
      ? searchQuery.error instanceof Error
        ? searchQuery.error.message
        : String(searchQuery.error)
      : null)

  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true)
      setActive(0)
    }
  }, [suggestions])

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
      setSelectionError(null)
      setSelectionBusy(true)
      void ensurePlaceSelectionQueryData(suggestion)
        .then((place) => {
          onSelect(place)
        })
        .catch((cause) => {
          setSelectionError(cause instanceof Error ? cause.message : String(cause))
        })
        .finally(() => {
          setSelectionBusy(false)
        })
    },
    [onSelect]
  )

  const clear = useCallback(() => {
    setQuery("")
    setOpen(false)
    setSelectionError(null)
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
