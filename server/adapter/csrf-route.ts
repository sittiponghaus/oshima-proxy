import { apiPath } from "@/shared/http/api"
import { CSRF_COOKIE, CSRF_HEADER, generateCsrfToken } from "@/shared/http/security"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

const cookieOptions = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "strict" as const,
  path: "/",
  secure,
  maxAge: "8 hours" as const
})

export const CsrfRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter

    yield* router.add(
      "GET",
      apiPath("/csrf"),
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const existing = request.cookies[CSRF_COOKIE]
        const token = existing && existing.length === 64 ? existing : generateCsrfToken()
        const secure = Option.match(HttpServerRequest.toURL(request), {
          onNone: () => false,
          onSome: (url) => url.protocol === "https:"
        })

        const response = HttpServerResponse.jsonUnsafe(
          { token, header: CSRF_HEADER },
          {
            status: 200,
            headers: {
              "cache-control": "no-store"
            }
          }
        )

        return yield* HttpServerResponse.setCookie(response, CSRF_COOKIE, token, cookieOptions(secure)).pipe(
          Effect.orElseSucceed(() =>
            HttpServerResponse.setCookieUnsafe(response, CSRF_COOKIE, token, cookieOptions(secure))
          )
        )
      })
    )
  })
)
