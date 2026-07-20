import { Context, Layer } from "effect"

export type WorkerEnvBindings = {
  readonly OSHIMA_COOKIE?: string
  readonly OSHIMA_USER_AGENT?: string
  readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}

const optionalBinding = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export type DeployVersion = {
  readonly id: string
  readonly tag: string
  readonly timestamp: string
}

const deployVersionFromBinding = (meta: WorkerVersionMetadata | undefined): DeployVersion | undefined => {
  if (!meta?.id) return undefined
  return {
    id: meta.id,
    tag: meta.tag ?? "",
    timestamp: meta.timestamp ?? ""
  }
}

export class Environment extends Context.Service<
  Environment,
  {
    /** Optional Cookie when using a browser UA (e.g. `cf_clearance=…`). Not needed with default UA. */
    readonly oshimaCookie: string | undefined
    /** Optional UA override. Browser UAs need matching `OSHIMA_COOKIE`; default is non-browser. */
    readonly oshimaUserAgent: string | undefined
    /** Cloudflare Worker version metadata when deployed via versions. */
    readonly deployVersion: DeployVersion | undefined
  }
>()("oshima/Environment") {}

/** Cloudflare Workers vars / secrets / version metadata */
export const EnvironmentFromWorker = (env: WorkerEnvBindings) =>
  Layer.succeed(
    Environment,
    Environment.of({
      oshimaCookie: optionalBinding(env.OSHIMA_COOKIE),
      oshimaUserAgent: optionalBinding(env.OSHIMA_USER_AGENT),
      deployVersion: deployVersionFromBinding(env.CF_VERSION_METADATA)
    })
  )
