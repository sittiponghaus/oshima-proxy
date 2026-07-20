/**
 * Translation repository — TranslatorApi service + domain helpers.
 */
import {
  isTranslatorApiPresentAdapter,
  TranslatorApi,
  TranslationAvailabilityStatus,
  TranslationError,
  type TranslationLanguagePair
} from "@/app/adapter/translation.adapter"
import { Effect } from "effect"

export { TranslationAvailabilityStatus, TranslationError, TranslatorApi }
export type { TranslationLanguagePair }

export const isTranslatorApiPresent = (): boolean => isTranslatorApiPresentAdapter()

export const checkTranslationAvailability = Effect.fn("translation.checkAvailability")(function* (
  pair: TranslationLanguagePair
) {
  const api = yield* TranslatorApi
  return yield* api.checkAvailability(pair)
})

export const translateText = Effect.fn("translation.translateText")(function* (
  text: string,
  pair: TranslationLanguagePair
) {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return yield* new TranslationError({ message: "Nothing to translate" })
  }
  const api = yield* TranslatorApi
  return yield* api.translate(trimmed, pair)
})
