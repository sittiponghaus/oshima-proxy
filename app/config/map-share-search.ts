/**
 * Shareable map URL search params — Effect Schema validation + nuqs parsers.
 * Keys: `lat` / `lng` / `z` (camera) and `p` (active property key).
 */
import { Option, Schema } from "effect"
import { createParser, type ParserBuilder } from "nuqs"

/** Latitude encoded as a query string number in [-90, 90]. */
export const ShareLatitude = Schema.NumberFromString.check(
  Schema.isBetween({ minimum: -90, maximum: 90 })
)

/** Longitude encoded as a query string number in [-180, 180]. */
export const ShareLongitude = Schema.NumberFromString.check(
  Schema.isBetween({ minimum: -180, maximum: 180 })
)

/** MapLibre-friendly zoom encoded as a query string number in [0, 22]. */
export const ShareZoom = Schema.NumberFromString.check(Schema.isBetween({ minimum: 0, maximum: 22 }))

/** Non-empty Oshima property key. */
export const SharePropertyKey = Schema.NonEmptyString

/**
 * Build a nuqs parser from an Effect Schema whose encoded form is a string
 * (e.g. `NumberFromString`, `NonEmptyString`).
 */
export function createEffectParser<A>(schema: Schema.Codec<A, string>): ParserBuilder<A> {
  const decode = Schema.decodeUnknownOption(schema)
  const encode = Schema.encodeUnknownSync(schema)
  return createParser<A>({
    parse: (queryValue) => Option.getOrNull(decode(queryValue)),
    serialize: (value) => String(encode(value)),
    eq: (left, right) => Object.is(left, right)
  })
}

/** Round camera floats so share URLs stay short (~1 m at equator for 5 dp). */
function roundShareCoord(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function createRoundedFloatParser(schema: Schema.Codec<number, string>, digits: number): ParserBuilder<number> {
  const base = createEffectParser(schema)
  return createParser({
    parse: base.parse,
    serialize: (value) => base.serialize(roundShareCoord(value, digits)),
    eq: base.eq
  })
}

export const parseAsShareLat = createRoundedFloatParser(ShareLatitude, 5)
export const parseAsShareLng = createRoundedFloatParser(ShareLongitude, 5)
export const parseAsShareZoom = createRoundedFloatParser(ShareZoom, 2)
export const parseAsSharePropertyKey = createEffectParser(SharePropertyKey)

/** nuqs `useQueryStates` map for shareable map state. */
export const mapShareSearchParams = {
  lat: parseAsShareLat,
  lng: parseAsShareLng,
  z: parseAsShareZoom,
  p: parseAsSharePropertyKey
} as const

export type MapShareSearch = {
  readonly lat: number | null
  readonly lng: number | null
  readonly z: number | null
  readonly p: string | null
}
