/**
 * React bindings for translation usecase (Translator API availability + translate).
 * Mirrors geolocation.hook: feature-detect, hide control when unsupported.
 */
import {
  checkTranslationAvailability,
  DEFAULT_TRANSLATION_PAIR,
  isTranslatorSupported,
  shouldShowTranslateControl,
  translateDescription,
  TranslationAvailabilityStatus,
  TranslationError,
  type TranslationLanguagePair
} from "@/app/usecase/translation.usecase"
import { Effect, Predicate } from "effect"
import { useCallback, useEffect, useState } from "react"

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
  const [support, setSupport] = useState<TranslatorSupportState>({ status: "checking" })

  useEffect(() => {
    if (!isTranslatorSupported()) {
      setSupport({ status: "unsupported" })
      return
    }

    let cancelled = false
    setSupport({ status: "checking" })

    void Effect.runPromise(checkTranslationAvailability(pair))
      .then((availability) => {
        if (cancelled) return
        if (!shouldShowTranslateControl(availability)) {
          setSupport({ status: "unsupported" })
          return
        }
        setSupport({ status: "ready", availability })
      })
      .catch(() => {
        if (cancelled) return
        setSupport({ status: "unsupported" })
      })

    return () => {
      cancelled = true
    }
  }, [pair.sourceLanguage, pair.targetLanguage])

  const translate = useCallback(
    (text: string) => Effect.runPromise(translateDescription(text, pair)),
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
