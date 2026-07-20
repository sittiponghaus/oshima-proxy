/**
 * Translation usecase — Effect programs + support helpers for hooks.
 */
import * as translationRepository from "@/app/repository/translation.repository"
import {
  TranslationAvailabilityStatus,
  TranslatorApi,
  type TranslationLanguagePair
} from "@/app/repository/translation.repository"
import { Effect } from "effect"

export {
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

const withTranslatorApi = <A, E>(effect: Effect.Effect<A, E, TranslatorApi>) =>
  effect.pipe(Effect.provide(TranslatorApi.Live))

export const checkTranslationAvailability = Effect.fn("usecase.checkTranslationAvailability")(function* (
  pair: TranslationLanguagePair = DEFAULT_TRANSLATION_PAIR
) {
  if (!isTranslatorSupported()) {
    return TranslationAvailabilityStatus.Unavailable
  }
  return yield* withTranslatorApi(translationRepository.checkTranslationAvailability(pair))
})

export const translateDescription = Effect.fn("usecase.translateDescription")(function* (
  text: string,
  pair: TranslationLanguagePair = DEFAULT_TRANSLATION_PAIR
) {
  return yield* withTranslatorApi(translationRepository.translateText(text, pair))
})
