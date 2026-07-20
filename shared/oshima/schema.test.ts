import { describe, expect, test } from "@effect/vitest"

import {
  PHOTO_BASE,
  flattenCluster,
  flattenMarker,
  mergeMapResponses,
  normalizeProperty,
  propertyContributeUrl,
  propertySourceUrl,
  type MapResponse,
  type PropertyUpstream
} from "./schema"

const sampleMap = (): MapResponse => ({
  markers: {
    a: [{ key: "m1", latitude: 1, longitude: 2, cluster_key: "c1" }],
    b: [{ key: "m2", latitude: 3, longitude: 4, cluster_key: "c2" }]
  },
  clusters: {
    c1: [
      {
        cluster_key: "c1",
        count: 2,
        latitude: 1.5,
        longitude: 2.5,
        min_latitude: 1,
        max_latitude: 2,
        min_longitude: 2,
        max_longitude: 3
      }
    ]
  }
})

describe("flattenMarker / flattenCluster", () => {
  test("flattens record buckets into arrays", () => {
    const response = sampleMap()
    expect(flattenMarker(response).map((m) => m.key)).toEqual(["m1", "m2"])
    expect(flattenCluster(response)).toHaveLength(1)
  })
})

describe("mergeMapResponses", () => {
  test("merges tile buckets; later parts win on key collision", () => {
    const first = sampleMap()
    const second: MapResponse = {
      markers: {
        a: [{ key: "override", latitude: 9, longitude: 9, cluster_key: "c9" }]
      },
      clusters: {}
    }
    const merged = mergeMapResponses([first, second])
    expect(merged.markers.a?.[0]?.key).toBe("override")
    expect(merged.markers.b?.[0]?.key).toBe("m2")
  })
})

describe("normalizeProperty", () => {
  test("maps upstream fields and builds photo URLs", () => {
    const raw: PropertyUpstream = {
      key: "abc",
      lat: 35.1,
      lng: 139.2,
      dt: " 2020 ",
      ad: " Address ",
      info: " Report ",
      cr: " Contributor ",
      tr: true,
      images: [{ name: "photo.jpg", width: 10, height: 20 }],
      links: [{ uri: "https://example.com", title: "  " }]
    }
    const detail = normalizeProperty(raw)
    expect(detail.key).toBe("abc")
    expect(detail.date).toBe(" 2020 ")
    expect(detail.address).toBe(" Address ")
    expect(detail.images[0]?.url).toBe(`${PHOTO_BASE}photo.jpg`)
    expect(detail.links[0]?.title).toBe("https://example.com")
    expect(detail.sourceUrl).toBe(propertySourceUrl("abc"))
    expect(detail.contributeUrl).toBe(propertyContributeUrl())
  })

  test("nulls blank optional strings and missing coords", () => {
    const detail = normalizeProperty({
      key: "k",
      dt: "   ",
      ad: "",
      info: undefined,
      cr: "\t",
      images: [],
      links: []
    })
    expect(detail.lat).toBeNull()
    expect(detail.lng).toBeNull()
    expect(detail.date).toBeNull()
    expect(detail.address).toBeNull()
    expect(detail.info).toBeNull()
    expect(detail.contribution).toBeNull()
    expect(detail.trusted).toBeNull()
  })
})

describe("property URLs", () => {
  test("source URL encodes the key", () => {
    expect(propertySourceUrl("a/b")).toContain("?p=a%2Fb")
  })
})
