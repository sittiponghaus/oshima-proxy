import { Effect, Layer, Schema } from "effect"
import {
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerResponse,
} from "effect/unstable/http"

import { Environment } from "@/server/config/environment"
import {
  normalizeProperty,
  OSHIMALAND_EN,
  OSHIMALAND_JP,
  PROPERTY_DATA_DIR_EN,
  PROPERTY_DATA_DIR_JP,
  PropertyUpstream,
  propertyContributeUrl,
  propertySourceUrl,
} from "@/shared/oshima/schema"

/** Non-browser UA: Chrome UA triggers Cloudflare JS challenge without cf_clearance. */
const DEFAULT_USER_AGENT = "oshima-proxy/1.0"

const KeyParam = Schema.Struct({
  key: Schema.String,
})

const KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
} as const

const jsonError = (
  status: number,
  body: Record<string, unknown>,
) => HttpServerResponse.jsonUnsafe(body, { status, headers: corsHeaders })

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
    { url: `${OSHIMALAND_JP}${PROPERTY_DATA_DIR_JP}${encoded}.json` },
  ]
}

export const PropertyRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter
    const env = yield* Environment

    yield* router.add(
      "OPTIONS",
      "/api/property/:key",
      HttpServerResponse.empty({ status: 204 }).pipe(
        HttpServerResponse.setHeaders(corsHeaders),
      ),
    )

    yield* router.add(
      "GET",
      "/api/property/:key",
      Effect.gen(function* () {
          const params = yield* HttpRouter.schemaPathParams(KeyParam).pipe(
            Effect.catch(() =>
              Effect.fail(
                jsonError(400, { error: "Property key is required", cloudflare: false }),
              ),
            ),
          )
          const key = params.key.trim()
          if (!KEY_RE.test(key)) {
            return jsonError(400, {
              error: "Invalid property key",
              cloudflare: false,
            })
          }

          const userAgent = env.oshimaUserAgent ?? DEFAULT_USER_AGENT
          let sawCloudflare = false
          let lastStatus = 0

          for (const upstream of propertyUpstreams(key)) {
            // Match bare HTTPie/curl-style clients: Accept + non-browser UA, no Origin/Referer.
            // A browser Chrome UA without cf_clearance gets Cloudflare challenged on Bun's TLS stack.
            const headers: Record<string, string> = {
              accept: "application/json, */*;q=0.5",
              "user-agent": userAgent,
            }
            if (env.oshimaCookie) {
              headers.cookie = env.oshimaCookie
            }

            const request = HttpClientRequest.setHeaders(
              HttpClientRequest.get(upstream.url),
              headers,
            )

            const response = yield* HttpClient.execute(request).pipe(
              Effect.catch(() => Effect.succeed(null)),
            )
            if (!response) {
              continue
            }

            const text = yield* response.text
            lastStatus = response.status

            if (looksLikeCloudflareChallenge(response.status, text)) {
              sawCloudflare = true
              continue
            }

            if (response.status === 404) {
              return jsonError(404, {
                error: "Property not found",
                cloudflare: false,
                key,
                sourceUrl: propertySourceUrl(key),
                contributeUrl: propertyContributeUrl(),
              })
            }

            if (response.status < 200 || response.status >= 300) {
              continue
            }

            let parsed: unknown
            try {
              parsed = JSON.parse(text)
            } catch {
              continue
            }

            const decoded = yield* Schema.decodeUnknownEffect(PropertyUpstream)(
              parsed,
            ).pipe(Effect.catch(() => Effect.succeed(null)))
            if (!decoded) {
              continue
            }

            const detail = normalizeProperty({
              ...decoded,
              key: decoded.key || key,
            })

            return HttpServerResponse.jsonUnsafe(detail, {
              status: 200,
              headers: {
                ...corsHeaders,
                "cache-control": "private, max-age=60",
              },
            })
          }

          if (sawCloudflare) {
            return jsonError(502, {
              error: env.oshimaCookie
                ? "Oshimaland still returned a Cloudflare challenge. Refresh cf_clearance in the browser and update OSHIMA_COOKIE (match OSHIMA_USER_AGENT)."
                : "Oshimaland property JSON is blocked by Cloudflare from this proxy. Use the default non-browser UA (or unset OSHIMA_USER_AGENT), or set OSHIMA_COOKIE + matching OSHIMA_USER_AGENT from a browser session.",
              cloudflare: true,
              key,
              sourceUrl: propertySourceUrl(key),
              contributeUrl: propertyContributeUrl(),
            })
          }

          if (lastStatus === 404) {
            return jsonError(404, {
              error: "Property not found",
              cloudflare: false,
              key,
              sourceUrl: propertySourceUrl(key),
              contributeUrl: propertyContributeUrl(),
            })
          }

          return jsonError(502, {
            error:
              lastStatus > 0
                ? `Upstream property API returned HTTP ${lastStatus}`
                : "Upstream property API unreachable",
            cloudflare: false,
            key,
            sourceUrl: propertySourceUrl(key),
            contributeUrl: propertyContributeUrl(),
          })
      }).pipe(
        Effect.catch(error => {
          if (
            typeof error === "object" &&
            error !== null &&
            "_id" in error &&
            (error as { _id: unknown })._id === "HttpServerResponse"
          ) {
            return Effect.succeed(
              error as HttpServerResponse.HttpServerResponse,
            )
          }
          return Effect.succeed(
            jsonError(502, {
              error: "Upstream property API unreachable",
              cloudflare: false,
            }),
          )
        }),
      ),
    )
  }),
)
