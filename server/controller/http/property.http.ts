import { Environment } from "@/server/config/environment"
import { cacheKeyReport, withRouteCache } from "@/server/runtime/response-cache"
import { apiPath } from "@/shared/http/api"
import {
  normalizeProperty,
  OSHIMALAND_EN,
  OSHIMALAND_JP,
  PROPERTY_DATA_DIR_EN,
  PROPERTY_DATA_DIR_JP,
  PropertyUpstream,
  propertyContributeUrl,
  propertySourceUrl
} from "@/shared/oshima/schema"
import { Effect, Layer, Result, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpRouter, HttpServerResponse } from "effect/unstable/http"

import { name, version } from "package.json"

/** Non-browser UA: Chrome UA triggers Cloudflare JS challenge without cf_clearance. */
const DEFAULT_USER_AGENT = `${name}/${version}`

const KeyParam = Schema.Struct({
  key: Schema.String
})

const KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/

const jsonError = (status: number, body: Record<string, unknown>) => HttpServerResponse.jsonUnsafe(body, { status })

const looksLikeCloudflareChallenge = (status: number, text: string) => {
  if (status === 403 || status === 503) {
    const lower = text.slice(0, 2000).toLowerCase()
    return (
      lower.includes("just a moment") ||
      lower.includes("cf-mitigated") ||
      lower.includes("cloudflare") ||
      lower.includes("challenge-platform")
    )
  }
  return false
}

type UpstreamAttempt = {
  readonly url: string
}

const propertyUpstreams = (key: string): ReadonlyArray<UpstreamAttempt> => {
  const encoded = encodeURIComponent(key)
  return [
    { url: `${OSHIMALAND_EN}${PROPERTY_DATA_DIR_EN}${encoded}.json` },
    { url: `${OSHIMALAND_JP}${PROPERTY_DATA_DIR_JP}${encoded}.json` }
  ]
}

export const PropertyRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter
    const env = yield* Environment

    yield* router.add(
      "GET",
      apiPath("/property/:key"),
      Effect.gen(function* () {
        const params = yield* HttpRouter.schemaPathParams(KeyParam).pipe(
          Effect.catch(() => Effect.fail(jsonError(400, { error: "Property key is required", cloudflare: false })))
        )
        const key = params.key.trim()
        if (!KEY_RE.test(key)) {
          return jsonError(400, {
            error: "Invalid property key",
            cloudflare: false
          })
        }

        const userAgent = env.oshimaUserAgent ?? DEFAULT_USER_AGENT

        return yield* withRouteCache({
          kind: "report",
          cacheKey: cacheKeyReport(key),
          load: Effect.gen(function* () {
            let sawCloudflare = false
            let lastStatus = 0

            for (const upstream of propertyUpstreams(key)) {
              const headers: Record<string, string> = {
                accept: "application/json, */*;q=0.5",
                "user-agent": userAgent
              }
              if (env.oshimaCookie) {
                headers.cookie = env.oshimaCookie
              }

              const request = HttpClientRequest.setHeaders(HttpClientRequest.get(upstream.url), headers)
              const response = yield* HttpClient.execute(request).pipe(Effect.catch(() => Effect.succeed(null)))
              if (!response) continue

              const text = yield* response.text
              lastStatus = response.status

              if (looksLikeCloudflareChallenge(response.status, text)) {
                sawCloudflare = true
                continue
              }

              // EN miss (404) should fall through to JP before giving up.
              if (response.status < 200 || response.status >= 300) continue

              const parseResult = yield* Effect.result(
                Effect.try({
                  try: (): unknown => JSON.parse(text),
                  catch: (cause) => cause
                })
              )
              if (!Result.isSuccess(parseResult)) continue
              const parsed = Result.getOrElse(parseResult, (): unknown => undefined)

              const decoded = yield* Schema.decodeUnknownEffect(PropertyUpstream)(parsed).pipe(
                Effect.catch(() => Effect.succeed(null))
              )
              if (!decoded) continue

              return normalizeProperty({
                ...decoded,
                key: decoded.key || key
              })
            }

            if (sawCloudflare) {
              return yield* Effect.fail(
                jsonError(502, {
                  error: env.oshimaCookie
                    ? "Oshimaland still returned a Cloudflare challenge. Refresh cf_clearance in the browser and update OSHIMA_COOKIE (match OSHIMA_USER_AGENT)."
                    : "Oshimaland property JSON is blocked by Cloudflare from this proxy. Use the default non-browser UA (or unset OSHIMA_USER_AGENT), or set OSHIMA_COOKIE + matching OSHIMA_USER_AGENT from a browser session.",
                  cloudflare: true,
                  key,
                  sourceUrl: propertySourceUrl(key),
                  contributeUrl: propertyContributeUrl()
                })
              )
            }

            if (lastStatus === 404) {
              return yield* Effect.fail(
                jsonError(404, {
                  error: "Property not found",
                  cloudflare: false,
                  key,
                  sourceUrl: propertySourceUrl(key),
                  contributeUrl: propertyContributeUrl()
                })
              )
            }

            return yield* Effect.fail(
              jsonError(502, {
                error:
                  lastStatus > 0
                    ? `Upstream property API returned HTTP ${lastStatus}`
                    : "Upstream property API unreachable",
                cloudflare: false,
                key,
                sourceUrl: propertySourceUrl(key),
                contributeUrl: propertyContributeUrl()
              })
            )
          })
        })
      }).pipe(
        Effect.catch((error) =>
          Effect.succeed(
            HttpServerResponse.isHttpServerResponse(error)
              ? error
              : jsonError(502, {
                  error: "Upstream property API unreachable",
                  cloudflare: false
                })
          )
        )
      )
    )
  })
)
