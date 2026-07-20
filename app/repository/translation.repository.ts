/**
 * Translation repository — domain helpers over `TranslatorApi`.
 */
import {
  isTranslatorApiPresent,
  TranslatorApi,
  TranslationAvailabilityStatus,
  TranslationError,
  type TranslationLanguagePair
} from "@/app/adapter/translation.adapter"
import { Effect } from "effect"

export { isTranslatorApiPresent, TranslationAvailabilityStatus, TranslationError, TranslatorApi }
export type { TranslationLanguagePair }

/** Empty-text guard then `TranslatorApi.translate`. */
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

export const checkTranslationAvailability = Effect.fn("translation.checkAvailability")(function* (
  pair: TranslationLanguagePair
) {
  const api = yield* TranslatorApi
  return yield* api.checkAvailability(pair)
})
