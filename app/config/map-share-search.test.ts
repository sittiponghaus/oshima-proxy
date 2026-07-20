import { describe, expect, test } from "@effect/vitest"

import {
  createEffectParser,
  parseAsShareLat,
  parseAsShareLng,
  parseAsSharePropertyKey,
  parseAsShareZoom,
  ShareLatitude
} from "./map-share-search"

describe("map share search parsers", () => {
  test("accepts valid lat/lng/zoom and rejects out of range", () => {
    expect(parseAsShareLat.parse("35.6895")).toBeCloseTo(35.6895)
    expect(parseAsShareLng.parse("139.6917")).toBeCloseTo(139.6917)
    expect(parseAsShareZoom.parse("14")).toBe(14)
    expect(parseAsShareLat.parse("91")).toBeNull()
    expect(parseAsShareLng.parse("-181")).toBeNull()
    expect(parseAsShareZoom.parse("23")).toBeNull()
    expect(parseAsShareLat.parse("nope")).toBeNull()
  })

  test("rounds serialized camera values for shorter URLs", () => {
    expect(parseAsShareLat.serialize(35.68951234)).toBe("35.68951")
    expect(parseAsShareLng.serialize(139.69171234)).toBe("139.69171")
    expect(parseAsShareZoom.serialize(14.256)).toBe("14.26")
  })

  test("requires a non-empty property key", () => {
    expect(parseAsSharePropertyKey.parse("abc")).toBe("abc")
    expect(parseAsSharePropertyKey.parse("")).toBeNull()
  })

  test("createEffectParser validates via Effect Schema", () => {
    const parser = createEffectParser(ShareLatitude)
    expect(parser.parse("0")).toBe(0)
    expect(parser.parse("100")).toBeNull()
  })
})
