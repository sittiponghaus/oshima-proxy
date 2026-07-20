/**
 * Browser Translator API adapter (Chrome built-in AI) as Effect + Context.Service.
 *
 * Public surface: `TranslatorApi` + `TranslatorApi.Live`.
 * Provide via `TranslatorApiRuntime` at the UI / test edge.
 *
 * @see https://developer.chrome.com/docs/ai/translator-api
 */
import { Context, Effect, Layer, Schema } from "effect"

export const TranslationAvailabilityStatus = {
  Unavailable: "unavailable",
  Downloadable: "downloadable",
  Downloading: "downloading",
  Available: "available"
} as const
export type TranslationAvailabilityStatus =
  (typeof TranslationAvailabilityStatus)[keyof typeof TranslationAvailabilityStatus]

export type TranslationLanguagePair = {
  readonly sourceLanguage: string
  readonly targetLanguage: string
}

export class TranslationError extends Schema.TaggedErrorClass<TranslationError>()("TranslationError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown)
}) {}

const AvailabilitySchema = Schema.Literals([
  TranslationAvailabilityStatus.Unavailable,
  TranslationAvailabilityStatus.Downloadable,
  TranslationAvailabilityStatus.Downloading,
  TranslationAvailabilityStatus.Available
])

const getTranslatorConstructor = (): object | null => {
  if (typeof globalThis === "undefined") return null
  const candidate = Reflect.get(globalThis, "Translator")
  // Chrome exposes `Translator` as a class (typeof "function"), not a plain object.
  if (candidate === null || (typeof candidate !== "object" && typeof candidate !== "function")) {
    return null
  }
  if (
    typeof Reflect.get(candidate, "availability") !== "function" ||
    typeof Reflect.get(candidate, "create") !== "function"
  ) {
    return null
  }
  return candidate
}

type TranslatorInstance = {
  readonly translate: (input: string) => Promise<string>
  readonly destroy?: () => void
}

const decodeTranslatorInstance = (value: unknown): Effect.Effect<TranslatorInstance, TranslationError> => {
  if (typeof value !== "object" || value === null) {
    return Effect.fail(new TranslationError({ message: "Translator.create returned an invalid translator." }))
  }
  const translate = Reflect.get(value, "translate")
  if (typeof translate !== "function") {
    return Effect.fail(new TranslationError({ message: "Translator.translate is not available." }))
  }
  const destroy = Reflect.get(value, "destroy")
  return Effect.succeed({
    translate: (input: string) => Promise.resolve(translate.call(value, input)),
    destroy: typeof destroy === "function" ? () => destroy.call(value) : undefined
  })
}

const acquireTranslator = (pair: TranslationLanguagePair, onDownloadProgress?: (loaded: number) => void) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const api = getTranslatorConstructor()
      if (!api) {
        return yield* new TranslationError({ message: "Translator API is not supported by this browser." })
      }
      const create = Reflect.get(api, "create")
      if (typeof create !== "function") {
        return yield* new TranslationError({ message: "Translator.create is not available." })
      }

      const raw = yield* Effect.tryPromise({
        try: () =>
          create.call(api, {
            sourceLanguage: pair.sourceLanguage,
            targetLanguage: pair.targetLanguage,
            monitor: onDownloadProgress
              ? (monitor: unknown) => {
                  if (typeof monitor !== "object" || monitor === null) return
                  const addEventListener = Reflect.get(monitor, "addEventListener")
                  if (typeof addEventListener !== "function") return
                  addEventListener.call(monitor, "downloadprogress", (event: unknown) => {
                    if (typeof event !== "object" || event === null) return
                    const loaded = Reflect.get(event, "loaded")
                    if (typeof loaded === "number") onDownloadProgress(loaded)
                  })
                }
              : undefined
          }),
        catch: (cause) =>
          new TranslationError({
            message: cause instanceof Error ? cause.message : "Failed to create translator",
            cause
          })
      })

      return yield* decodeTranslatorInstance(raw)
    }),
    (translator) =>
      Effect.sync(() => {
        translator.destroy?.()
      })
  )

const checkAvailability = Effect.fn("TranslatorApi.checkAvailability")(function* (pair: TranslationLanguagePair) {
  const api = getTranslatorConstructor()
  if (!api) {
    return TranslationAvailabilityStatus.Unavailable
  }
  const availability = Reflect.get(api, "availability")
  if (typeof availability !== "function") {
    return TranslationAvailabilityStatus.Unavailable
  }

  const raw = yield* Effect.tryPromise({
    try: () => availability.call(api, pair),
    catch: (cause) =>
      new TranslationError({
        message: cause instanceof Error ? cause.message : "Could not check Translator availability",
        cause
      })
  })

  return yield* Schema.decodeUnknownEffect(AvailabilitySchema)(raw).pipe(
    Effect.mapError(
      (cause) =>
        new TranslationError({
          message: "Translator.availability returned an unexpected status",
          cause
        })
    )
  )
})

const translate = Effect.fn("TranslatorApi.translate")(function* (
  text: string,
  pair: TranslationLanguagePair
) {
  return yield* Effect.scoped(
    Effect.gen(function* () {
      const translator = yield* acquireTranslator(pair)
      const result = yield* Effect.tryPromise({
        try: () => translator.translate(text),
        catch: (cause) =>
          new TranslationError({
            message: cause instanceof Error ? cause.message : "Translation failed",
            cause
          })
      })
      if (typeof result !== "string") {
        return yield* new TranslationError({ message: "Translator.translate returned a non-string result." })
      }
      return result
    })
  )
})

/** Sync feature-detect for UI gates (no Effect / Layer required). */
export function isTranslatorApiPresent(): boolean {
  return getTranslatorConstructor() !== null
}

/**
 * Browser Translator API service.
 *
 * Yield with `yield* TranslatorApi`; provide `TranslatorApi.Live` via
 * `TranslatorApiRuntime` at the UI / test edge.
 */
export class TranslatorApi extends Context.Service<
  TranslatorApi,
  {
    readonly isPresent: () => boolean
    readonly checkAvailability: (
      pair: TranslationLanguagePair
    ) => Effect.Effect<TranslationAvailabilityStatus, TranslationError>
    readonly translate: (text: string, pair: TranslationLanguagePair) => Effect.Effect<string, TranslationError>
  }
>()("TranslatorApi") {
  static readonly Live = Layer.succeed(TranslatorApi)({
    isPresent: isTranslatorApiPresent,
    checkAvailability,
    translate
  })
}
