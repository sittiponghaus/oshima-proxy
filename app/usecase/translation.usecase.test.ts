import {
  DEFAULT_TRANSLATION_PAIR,
  isTranslatorSupported,
  shouldShowTranslateControl,
  TranslationAvailabilityStatus
} from "@/app/usecase/translation.usecase"
import { describe, expect, it } from "vitest"

describe("isTranslatorSupported", () => {
  it("returns a boolean", () => {
    expect(typeof isTranslatorSupported()).toBe("boolean")
  })
})

describe("shouldShowTranslateControl", () => {
  it("hides when unavailable", () => {
    expect(shouldShowTranslateControl(TranslationAvailabilityStatus.Unavailable)).toBe(false)
  })

  it("shows when available or downloadable", () => {
    expect(shouldShowTranslateControl(TranslationAvailabilityStatus.Available)).toBe(true)
    expect(shouldShowTranslateControl(TranslationAvailabilityStatus.Downloadable)).toBe(true)
    expect(shouldShowTranslateControl(TranslationAvailabilityStatus.Downloading)).toBe(true)
  })
})

describe("DEFAULT_TRANSLATION_PAIR", () => {
  it("targets English from Japanese", () => {
    expect(DEFAULT_TRANSLATION_PAIR).toEqual({ sourceLanguage: "ja", targetLanguage: "en" })
  })
})
