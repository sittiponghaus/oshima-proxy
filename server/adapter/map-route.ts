import { Effect, Layer, Result, Schema } from "effect"
import {
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http"

import { MapResponse, mergeMapResponses } from "@/shared/oshima/schema"

const UPSTREAM = "https://api.oshimaland.co.jp/map"
/**
 * Upstream returns 413 once the JSON body gets large (~180 z16 keys).
 * Stay well under that so every viewport tile can be fetched in batches.
 */
const UPSTREAM_KEY_BATCH = 100

const MapRequestBody = Schema.Struct({
  keys: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
})

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
} as const

const jsonError = (status: number, error: string) =>
  HttpServerResponse.jsonUnsafe({ error }, { status, headers: corsHeaders })

function chunkKeys(keys: readonly string[], size: number): string[][] {
  const batches: string[][] = []
  for (let i = 0; i < keys.length; i += size) {
    batches.push(keys.slice(i, i + size))
  }
  return batches
}

const fetchUpstreamBatch = (keys: readonly string[]) =>
  Effect.gen(function* () {
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.post(UPSTREAM),
      { keys },
    )
    const upstreamRequest = HttpClientRequest.setHeaders(request, {
      accept: "application/json",
      origin: "https://www.oshimaland.com",
      referer: "https://www.oshimaland.com/",
    })

    const response = yield* HttpClient.execute(upstreamRequest)
    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.fail(
        jsonError(502, `Upstream map API returned HTTP ${response.status}`),
      )
    }

    const text = yield* response.text
    return yield* Schema.decodeUnknownEffect(MapResponse)(JSON.parse(text))
  })

export const MapRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter

    yield* router.add(
      "OPTIONS",
      "/api/map",
      HttpServerResponse.empty({ status: 204 }).pipe(
        HttpServerResponse.setHeaders(corsHeaders),
      ),
    )

    yield* router.add(
      "POST",
      "/api/map",
      Effect.gen(function* () {
        const decoded = yield* Effect.result(
          HttpServerRequest.schemaBodyJson(MapRequestBody),
        )
        if (Result.isFailure(decoded)) {
          return jsonError(400, "Body must be { keys: string[] } (min 1)")
        }

        const body = Result.getOrThrow(decoded)
        const batches = chunkKeys(body.keys, UPSTREAM_KEY_BATCH)
        const parts = yield* Effect.forEach(batches, fetchUpstreamBatch, {
          concurrency: 4,
        })
        const payload = mergeMapResponses(parts)

        return HttpServerResponse.jsonUnsafe(payload, {
          status: 200,
          headers: {
            ...corsHeaders,
            "cache-control": "private, max-age=30",
          },
        })
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(
            typeof error === "object" &&
              error !== null &&
              "_id" in error &&
              (error as { _id: unknown })._id === "HttpServerResponse"
              ? (error as HttpServerResponse.HttpServerResponse)
              : jsonError(502, "Upstream map API unreachable"),
          ),
        ),
      ),
    )
  }),
)
