import { useCallback, useEffect, useId, useRef, useState } from "react";

export type PlaceSuggestion = {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
};

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  onSelect: (place: PlaceResult) => void;
};

export function SearchBox({ onSelect }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError(null);
        try {
          const url = new URL("/api/places/autocomplete", location.origin);
          url.searchParams.set("q", q);
          const res = await fetch(url);
          const json = (await res.json()) as {
            suggestions?: PlaceSuggestion[];
            error?: string;
          };
          if (!res.ok) {
            setSuggestions([]);
            setError(json.error ?? `Search failed (${res.status})`);
            return;
          }
          setSuggestions(json.suggestions ?? []);
          setOpen(true);
          setActive(0);
        } catch (cause) {
          setSuggestions([]);
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          setBusy(false);
        }
      })();
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const choose = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setQuery(suggestion.mainText || suggestion.label);
      setOpen(false);
      setError(null);

      if (
        typeof suggestion.lat === "number" &&
        typeof suggestion.lng === "number" &&
        Number.isFinite(suggestion.lat) &&
        Number.isFinite(suggestion.lng)
      ) {
        onSelect({
          placeId: suggestion.placeId,
          name: suggestion.mainText || suggestion.label,
          address: suggestion.label,
          lat: suggestion.lat,
          lng: suggestion.lng,
        });
        return;
      }

      setBusy(true);
      try {
        const url = new URL("/api/places/details", location.origin);
        url.searchParams.set("placeId", suggestion.placeId);
        const res = await fetch(url);
        const json = (await res.json()) as PlaceResult & { error?: string };
        if (!res.ok) {
          setError(json.error ?? `Place lookup failed (${res.status})`);
          return;
        }
        onSelect(json);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy(false);
      }
    },
    [onSelect],
  );

  const clear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setError(null);
    inputRef.current?.focus();
  }, []);

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
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && open && suggestions.length > 0) {
            event.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (event.key === "ArrowUp" && open && suggestions.length > 0) {
            event.preventDefault();
            setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" && open && suggestions.length > 0) {
            event.preventDefault();
            const pick = suggestions[active];
            if (pick) void choose(pick);
          } else if (event.key === "Escape") {
            if (open) {
              setOpen(false);
            } else if (query.length > 0) {
              clear();
            }
          }
        }}
      />
      {busy ? (
        <span
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 size-3.5 animate-spin rounded-full border border-[var(--muted)] border-t-[var(--ink)]"
          aria-hidden="true"
        />
      ) : query.length > 0 ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={clear}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-[var(--ember)]">{error}</p>
      ) : query.length === 0 ? (
        <p className="mt-1.5 text-[0.65rem] text-[var(--muted)]">
          Powered by OpenStreetMap — flies the map to any address or city
        </p>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="oshima-panel absolute inset-x-0 top-[calc(100%+0.4rem)] z-[1100] overflow-hidden border border-[var(--line)] bg-[var(--panel)] shadow-lg backdrop-blur"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="option" aria-selected={index === active}>
              <button
                id={`${listId}-${index}`}
                type="button"
                className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm ${
                  index === active ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onMouseEnter={() => setActive(index)}
                onClick={() => void choose(suggestion)}
              >
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
  );
}
