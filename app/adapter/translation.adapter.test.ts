import {
  isTranslatorApiPresent,
  TranslationAvailabilityStatus,
  TranslationError,
  TranslatorApi
} from "@/app/adapter/translation.adapter"
import { TranslatorApiRuntime } from "@/app/runtime/translator-api.runtime"
import { Effect } from "effect"
import { afterEach, describe, expect, it } from "vitest"

describe("isTranslatorApiPresent", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "Translator")
  })

  it("returns false when Translator is missing", () => {
    Reflect.deleteProperty(globalThis, "Translator")
    expect(isTranslatorApiPresent()).toBe(false)
  })

  it("accepts Translator as a class (typeof function)", () => {
    class Translator {
      static availability() {
        return Promise.resolve("available")
      }
      static create() {
        return Promise.resolve({ translate: () => Promise.resolve("ok") })
      }
    }
    Reflect.set(globalThis, "Translator", Translator)
    expect(isTranslatorApiPresent()).toBe(true)
  })
})

describe("TranslatorApi.checkAvailability", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "Translator")
  })

  it("reads availability from Translator class static methods", async () => {
    class Translator {
      static availability() {
        return Promise.resolve("downloadable")
      }
      static create() {
        return Promise.resolve({ translate: () => Promise.resolve("ok") })
      }
    }
    Reflect.set(globalThis, "Translator", Translator)
    await expect(
      TranslatorApiRuntime.runPromise(
        Effect.gen(function* () {
          const api = yield* TranslatorApi
          return yield* api.checkAvailability({ sourceLanguage: "ja", targetLanguage: "en" })
        })
      )
    ).resolves.toBe(TranslationAvailabilityStatus.Downloadable)
  })

  it("fails when availability returns an unknown status", async () => {
    class Translator {
      static availability() {
        return Promise.resolve("nope")
      }
      static create() {
        return Promise.resolve({ translate: () => Promise.resolve("ok") })
      }
    }
    Reflect.set(globalThis, "Translator", Translator)
    await expect(
      TranslatorApiRuntime.runPromise(
        Effect.gen(function* () {
          const api = yield* TranslatorApi
          return yield* api.checkAvailability({ sourceLanguage: "ja", targetLanguage: "en" })
        })
      )
    ).rejects.toSatisfy((error: unknown) => error instanceof TranslationError)
  })
})

describe("TranslatorApi.translate", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "Translator")
  })

  it("translates and destroys the translator instance", async () => {
    let destroyed = false
    class Translator {
      static availability() {
        return Promise.resolve("available")
      }
      static create() {
        return Promise.resolve({
          translate: (text: string) => Promise.resolve(`EN:${text}`),
          destroy: () => {
            destroyed = true
          }
        })
      }
    }
    Reflect.set(globalThis, "Translator", Translator)
    await expect(
      TranslatorApiRuntime.runPromise(
        Effect.gen(function* () {
          const api = yield* TranslatorApi
          return yield* api.translate("火災", { sourceLanguage: "ja", targetLanguage: "en" })
        })
      )
    ).resolves.toBe("EN:火災")
    expect(destroyed).toBe(true)
  })
})

describe("TranslatorApi.Live", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "Translator")
  })

  it("provides the Live layer for repository-style programs", async () => {
    class Translator {
      static availability() {
        return Promise.resolve("available")
      }
      static create() {
        return Promise.resolve({ translate: () => Promise.resolve("hello") })
      }
    }
    Reflect.set(globalThis, "Translator", Translator)

    const program = Effect.gen(function* () {
      const api = yield* TranslatorApi
      return yield* api.translate("x", { sourceLanguage: "ja", targetLanguage: "en" })
    })

    await expect(TranslatorApiRuntime.runPromise(program)).resolves.toBe("hello")
  })
})
