import { Schema } from "effect"

export const MapMarker = Schema.Struct({
  key: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  cluster_key: Schema.String
})
export type MapMarker = typeof MapMarker.Type

export const MapCluster = Schema.Struct({
  cluster_key: Schema.String,
  count: Schema.Number,
  latitude: Schema.Number,
  longitude: Schema.Number,
  min_latitude: Schema.Number,
  max_latitude: Schema.Number,
  min_longitude: Schema.Number,
  max_longitude: Schema.Number
})
export type MapCluster = typeof MapCluster.Type

export const MapResponse = Schema.Struct({
  markers: Schema.Record(Schema.String, Schema.Array(MapMarker)),
  clusters: Schema.Record(Schema.String, Schema.Array(MapCluster))
})
export type MapResponse = typeof MapResponse.Type

export const MapRequest = Schema.Struct({
  keys: Schema.Array(Schema.String)
})
export type MapRequest = typeof MapRequest.Type

export function flattenMarkers(response: MapResponse): MapMarker[] {
  return Object.values(response.markers).flat()
}

export function flattenClusters(response: MapResponse): MapCluster[] {
  return Object.values(response.clusters).flat()
}

/** Merge batched `/map` responses (same tile key may appear once). */
export function mergeMapResponses(parts: readonly MapResponse[]): MapResponse {
  const markers: Record<string, MapMarker[]> = {}
  const clusters: Record<string, MapCluster[]> = {}
  for (const part of parts) {
    Object.assign(markers, part.markers)
    Object.assign(clusters, part.clusters)
  }
  return { markers, clusters }
}

/** Upstream Oshimaland property JSON (`/d_en/{key}.json`) */
export const PropertyImage = Schema.Struct({
  name: Schema.String,
  width: Schema.optionalKey(Schema.Number),
  height: Schema.optionalKey(Schema.Number)
})
export type PropertyImage = typeof PropertyImage.Type

export const PropertyLink = Schema.Struct({
  uri: Schema.String,
  title: Schema.optionalKey(Schema.String)
})
export type PropertyLink = typeof PropertyLink.Type

export const PropertyUpstream = Schema.Struct({
  key: Schema.String,
  lat: Schema.optionalKey(Schema.Number),
  lng: Schema.optionalKey(Schema.Number),
  dt: Schema.optionalKey(Schema.String),
  ad: Schema.optionalKey(Schema.String),
  info: Schema.optionalKey(Schema.String),
  cr: Schema.optionalKey(Schema.String),
  tr: Schema.optionalKey(Schema.Boolean),
  images: Schema.optionalKey(Schema.Array(PropertyImage)),
  links: Schema.optionalKey(Schema.Array(PropertyLink))
})
export type PropertyUpstream = typeof PropertyUpstream.Type

/** Normalized property detail returned by `/api/v1/property/:key` */
export const PropertyDetail = Schema.Struct({
  key: Schema.String,
  lat: Schema.NullOr(Schema.Number),
  lng: Schema.NullOr(Schema.Number),
  date: Schema.NullOr(Schema.String),
  address: Schema.NullOr(Schema.String),
  info: Schema.NullOr(Schema.String),
  contribution: Schema.NullOr(Schema.String),
  trusted: Schema.NullOr(Schema.Boolean),
  images: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      width: Schema.NullOr(Schema.Number),
      height: Schema.NullOr(Schema.Number),
      url: Schema.String
    })
  ),
  links: Schema.Array(
    Schema.Struct({
      uri: Schema.String,
      title: Schema.String
    })
  ),
  sourceUrl: Schema.String,
  contributeUrl: Schema.String
})
export type PropertyDetail = typeof PropertyDetail.Type

export const PHOTO_BASE = "https://static.oshimaland.co.jp/photos/"
export const OSHIMALAND_EN = "https://www.oshimaland.com"
export const OSHIMALAND_JP = "https://www.oshimaland.co.jp"
/** English site property JSON prefix (`pc.en.js` PROPERTY_DATA_DIR). */
export const PROPERTY_DATA_DIR_EN = "/d_en/"
/** Japanese site property JSON prefix (`/d/` when IsJp). */
export const PROPERTY_DATA_DIR_JP = "/d/"
export function propertySourceUrl(key: string): string {
  return `${OSHIMALAND_EN}/?p=${encodeURIComponent(key)}`
}

/**
 * Best public entry to Oshimaland’s contribute flow.
 * Posting is in-map only: right-click → “Post a Stigmatized Property” (zoom ≥ 18).
 */
export function propertyContributeUrl(): string {
  return `${OSHIMALAND_EN}/`
}

export function normalizeProperty(raw: PropertyUpstream): PropertyDetail {
  const key = raw.key
  return {
    key,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    date: raw.dt?.trim() ? raw.dt : null,
    address: raw.ad?.trim() ? raw.ad : null,
    info: raw.info?.trim() ? raw.info : null,
    contribution: raw.cr?.trim() ? raw.cr : null,
    trusted: raw.tr ?? null,
    images: (raw.images ?? []).map((img) => ({
      name: img.name,
      width: img.width ?? null,
      height: img.height ?? null,
      url: `${PHOTO_BASE}${img.name}`
    })),
    links: (raw.links ?? []).map((link) => ({
      uri: link.uri,
      title: link.title?.trim() ? link.title : link.uri
    })),
    sourceUrl: propertySourceUrl(key),
    contributeUrl: propertyContributeUrl()
  }
}
