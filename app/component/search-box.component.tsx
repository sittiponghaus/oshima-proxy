import type { PlaceSuggestion } from "@/app/usecase/place.usecase"
import type { RefObject } from "react"

import { Spinner } from "./icon.component"

type Props = {
  readonly listId: string
  readonly query: string
  readonly suggestions: readonly PlaceSuggestion[]
  readonly open: boolean
  readonly busy: boolean
  readonly error: string | null
  readonly active: number
  readonly wrapRef: RefObject<HTMLDivElement | null>
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly onQueryChange: (value: string) => void
  readonly onOpen: () => void
  readonly onClear: () => void
  readonly onChoose: (suggestion: PlaceSuggestion) => void
  readonly onActiveChange: (index: number) => void
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

/** Places search combobox UI (no fetch / usecase calls). */
export function SearchBoxView({
  listId,
  query,
  suggestions,
  open,
  busy,
  error,
  active,
  wrapRef,
  inputRef,
  onQueryChange,
  onOpen,
  onClear,
  onChoose,
  onActiveChange,
  onKeyDown
}: Props) {
  return (
    <div ref={wrapRef} className="relative w-full">
      <label className="sr-only" htmlFor="place-search">
        Search for a place
      </label>
      <input
        ref={inputRef}
        id="place-search"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
        className="w-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 pr-9 text-sm text-[var(--ink)] shadow-sm outline-none backdrop-blur placeholder:text-[var(--muted)] focus:border-[var(--ember)]"
        placeholder="Search a place…"
        value={query}
        autoComplete="off"
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={onOpen}
        onKeyDown={onKeyDown}
      />
      {busy ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
          <Spinner />
        </span>
      ) : query.length > 0 ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={onClear}>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {error ? <p className="mt-2 text-xs text-[var(--ember)]">{error}</p> : null}

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="oshima-panel absolute inset-x-0 top-[calc(100%+0.4rem)] z-[1100] overflow-hidden border border-[var(--line)] bg-[var(--panel)] shadow-lg backdrop-blur">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="option" aria-selected={index === active}>
              <button
                id={`${listId}-${index}`}
                type="button"
                className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm ${
                  index === active ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onMouseEnter={() => onActiveChange(index)}
                onClick={() => onChoose(suggestion)}>
                <span className="text-[var(--ink)]">{suggestion.mainText || suggestion.label}</span>
                {suggestion.secondaryText ? (
                  <span className="text-xs text-[var(--muted)]">{suggestion.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
