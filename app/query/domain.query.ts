/**
 * Domain TanStack Query options.
 *
 * Containers/hooks subscribe with `useQuery(...)` or imperatively
 * `queryClient.ensureQueryData(...)`. QueryFns run Effect programs via
 * ManagedRuntime at the edge.
 */
import { queryClient } from "@/app/query/query-client"
import { ApiHttpRuntime } from "@/app/runtime/api-http.runtime"
import { TranslatorApiRuntime } from "@/app/runtime/translator-api.runtime"
import { bootstrapCsrf } from "@/app/usecase/csrf.usecase"
import { loadMapTile } from "@/app/usecase/map-tile.usecase"
import {
  resolvePlaceSelection,
  searchPlace,
  shouldSearchPlace,
  type PlaceSuggestion
} from "@/app/usecase/place.usecase"
import { loadPropertyDetail } from "@/app/usecase/property.usecase"
import {
  checkTranslationAvailability,
  translateDescription,
  type TranslationLanguagePair
} from "@/app/usecase/translation.usecase"
import { keepPreviousData, queryOptions } from "@tanstack/react-query"

export const domainQueryKey = {
  all: () => ["domain"] as const,
  csrf: () => [...domainQueryKey.all(), "csrf"] as const,
  mapTile: (keysSignature: string) => [...domainQueryKey.all(), "map-tile", keysSignature] as const,
  property: (key: string) => [...domainQueryKey.all(), "property", key] as const,
  placeSearch: (query: string) => [...domainQueryKey.all(), "place-search", query] as const,
  placeSelection: (placeId: string) => [...domainQueryKey.all(), "place-selection", placeId] as const,
  translationAvailability: (pair: TranslationLanguagePair) =>
    [...domainQueryKey.all(), "translation-availability", pair.sourceLanguage, pair.targetLanguage] as const,
  translation: (text: string, pair: TranslationLanguagePair) =>
    [...domainQueryKey.all(), "translation", pair.sourceLanguage, pair.targetLanguage, text] as const
} as const

export const csrfQueryOptions = () =>
  queryOptions({
    queryKey: domainQueryKey.csrf(),
    queryFn: () => ApiHttpRuntime.runPromise(bootstrapCsrf()),
    staleTime: Infinity
  })

export const mapTileQueryOptions = (keysSignature: string) =>
  queryOptions({
    queryKey: domainQueryKey.mapTile(keysSignature),
    queryFn: () => ApiHttpRuntime.runPromise(loadMapTile(keysSignature)),
    enabled: keysSignature.length > 0,
    placeholderData: keepPreviousData
  })

export const propertyDetailQueryOptions = (key: string) =>
  queryOptions({
    queryKey: domainQueryKey.property(key),
    queryFn: () => ApiHttpRuntime.runPromise(loadPropertyDetail(key))
  })

export const placeSearchQueryOptions = (query: string) => {
  const trimmed = query.trim()
  return queryOptions({
    queryKey: domainQueryKey.placeSearch(trimmed),
    queryFn: () => ApiHttpRuntime.runPromise(searchPlace(trimmed)),
    enabled: shouldSearchPlace(trimmed)
  })
}

export const placeSelectionQueryOptions = (suggestion: PlaceSuggestion) =>
  queryOptions({
    queryKey: domainQueryKey.placeSelection(suggestion.placeId),
    queryFn: () => ApiHttpRuntime.runPromise(resolvePlaceSelection(suggestion))
  })

export const translationAvailabilityQueryOptions = (pair: TranslationLanguagePair) =>
  queryOptions({
    queryKey: domainQueryKey.translationAvailability(pair),
    queryFn: () => TranslatorApiRuntime.runPromise(checkTranslationAvailability(pair)),
    staleTime: 60_000
  })

export const translationQueryOptions = (text: string, pair: TranslationLanguagePair) =>
  queryOptions({
    queryKey: domainQueryKey.translation(text, pair),
    queryFn: () => TranslatorApiRuntime.runPromise(translateDescription(text, pair))
  })

/** Imperative ensure helpers (event handlers / bootstrap). */
export const ensureCsrfQueryData = () => queryClient.ensureQueryData(csrfQueryOptions())

export const ensurePlaceSelectionQueryData = (suggestion: PlaceSuggestion) =>
  queryClient.ensureQueryData(placeSelectionQueryOptions(suggestion))

export const ensureTranslationQueryData = (text: string, pair: TranslationLanguagePair) =>
  queryClient.ensureQueryData(translationQueryOptions(text, pair))
