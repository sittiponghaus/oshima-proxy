/**
 * Translation usecase — Effect programs + support helpers for hooks.
 * Require `TranslatorApi`; run via `TranslatorApiRuntime` at the UI edge.
 */
import * as translationRepository from "@/app/repository/translation.repository"
import {
  TranslationAvailabilityStatus,
  type TranslationLanguagePair
} from "@/app/repository/translation.repository"
import { Effect } from "effect"

export {
  isTranslatorApiPresent,
  TranslationAvailabilityStatus,
  TranslationError,
  TranslatorApi,
  type TranslationLanguagePair
} from "@/app/repository/translation.repository"

/** Default pair for Oshimaland reports on the English UI. */
export const DEFAULT_TRANSLATION_PAIR: TranslationLanguagePair = {
  sourceLanguage: "ja",
  targetLanguage: "en"
}

export function isTranslatorSupported(): boolean {
  return translationRepository.isTranslatorApiPresent()
}

export function shouldShowTranslateControl(availability: TranslationAvailabilityStatus): boolean {
  return (
    availability === TranslationAvailabilityStatus.Available ||
    availability === TranslationAvailabilityStatus.Downloadable ||
    availability === TranslationAvailabilityStatus.Downloading
  )
}

export const checkTranslationAvailability = Effect.fn("usecase.checkTranslationAvailability")(function* (
  pair: TranslationLanguagePair = DEFAULT_TRANSLATION_PAIR
) {
  if (!isTranslatorSupported()) {
    return TranslationAvailabilityStatus.Unavailable
  }
  return yield* translationRepository.checkTranslationAvailability(pair)
})

export const translateDescription = Effect.fn("usecase.translateDescription")(function* (
  text: string,
  pair: TranslationLanguagePair = DEFAULT_TRANSLATION_PAIR
) {
  return yield* translationRepository.translateText(text, pair)
})
