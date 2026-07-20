/**
 * React bindings for translation usecase (Translator API availability + translate).
 * Availability via useQuery; translate via ensureQueryData.
 */
import {
  ensureTranslationQueryData,
  translationAvailabilityQueryOptions
} from "@/app/query/domain.query"
import {
  DEFAULT_TRANSLATION_PAIR,
  isTranslatorSupported,
  shouldShowTranslateControl,
  TranslationAvailabilityStatus,
  TranslationError,
  type TranslationLanguagePair
} from "@/app/usecase/translation.usecase"
import { useQuery } from "@tanstack/react-query"
import { Predicate } from "effect"
import { useCallback, useMemo } from "react"

export {
  isTranslatorSupported,
  shouldShowTranslateControl,
  TranslationAvailabilityStatus,
  TranslationError,
  type TranslationLanguagePair
}

export type TranslatorSupportState =
  | { readonly status: "checking" }
  | { readonly status: "unsupported" }
  | { readonly status: "ready"; readonly availability: TranslationAvailabilityStatus }

function isTranslationError(error: unknown): error is TranslationError {
  return Predicate.isTagged(error, "TranslationError")
}

/**
 * Map-oriented helper: probe Translator API availability and translate on demand.
 * Returns `showControl` so the Translate button is only rendered when usable.
 */
export function useTranslator(pair: TranslationLanguagePair = DEFAULT_TRANSLATION_PAIR) {
  const supported = isTranslatorSupported()
  const availabilityQuery = useQuery({
    ...translationAvailabilityQueryOptions(pair),
    enabled: supported
  })

  const support: TranslatorSupportState = useMemo(() => {
    if (!supported) return { status: "unsupported" }
    if (availabilityQuery.isPending || availabilityQuery.isFetching) {
      return { status: "checking" }
    }
    if (availabilityQuery.isError || !availabilityQuery.data) {
      return { status: "unsupported" }
    }
    if (!shouldShowTranslateControl(availabilityQuery.data)) {
      return { status: "unsupported" }
    }
    return { status: "ready", availability: availabilityQuery.data }
  }, [
    availabilityQuery.data,
    availabilityQuery.isError,
    availabilityQuery.isFetching,
    availabilityQuery.isPending,
    supported
  ])

  const translate = useCallback(
    (text: string) => ensureTranslationQueryData(text, pair),
    [pair.sourceLanguage, pair.targetLanguage]
  )

  return {
    support,
    showControl: support.status === "ready",
    isChecking: support.status === "checking",
    translate,
    isTranslationError
  }
}
