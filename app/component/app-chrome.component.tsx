import { GITHUB_REPO_URL, OSHIMALAND_SITE_URL } from "@/app/config/site"
import type { ReactNode } from "react"

import { ChevronIcon, LocationCrosshairIcon, MoonIcon, SunIcon } from "./icon.component"

type HeaderProps = {
  readonly theme: "light" | "dark"
  readonly aboutOpen: boolean
  readonly onToggleTheme: () => void
  readonly onToggleAbout: () => void
  readonly search: ReactNode
  readonly locationControl: ReactNode
  readonly locationUnsupported: boolean
}

export function AppHeader({
  theme,
  aboutOpen,
  onToggleTheme,
  onToggleAbout,
  search,
  locationControl,
  locationUnsupported
}: HeaderProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[1000] p-3 md:p-4">
      <div className="pointer-events-auto flex w-full flex-col gap-2">
        <div className="oshima-panel border border-[var(--line)] bg-[var(--panel)] shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3 px-3 py-2 md:px-4 md:py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="text-base font-semibold tracking-tight md:text-lg">🔥</h1>
                <p className="text-xs text-[var(--muted)] md:text-sm">
                  <a
                    className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
                    href={OSHIMALAND_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer">
                    Oshima Land
                  </a>{" "}
                  Proxy
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={theme === "dark"}
                className="inline-flex size-7 items-center justify-center text-[var(--ink)] hover:text-[var(--ember)]"
                onClick={onToggleTheme}>
                {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
              </button>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-medium tracking-wide text-[var(--ember)] uppercase hover:underline"
                aria-expanded={aboutOpen}
                aria-controls="ol-proxy-about"
                onClick={onToggleAbout}>
                {aboutOpen ? "Less" : "About"}
                <ChevronIcon className={`size-3 transition-transform ${aboutOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
          {aboutOpen ? (
            <div id="ol-proxy-about" className="space-y-2.5 border-t border-[var(--line)] px-3 pb-2.5 pt-2 md:px-4">
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                We love traveling in Japan, and my girlfriend always wants to check{" "}
                <a
                  className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
                  href={OSHIMALAND_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer">
                  Oshimaland
                </a>
                {" ("}
                <a
                  className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
                  href="https://www.oshimaland.co.jp/"
                  target="_blank"
                  rel="noopener noreferrer">
                  JP
                </a>
                ) while we explore. The official site is useful, but hard to navigate day to day — zooming with scroll
                is awkward, search is tough to use, and moving around the map feels slow and fiddly.
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                OL Proxy is our attempt at a clearer map experience on top of the same public reports (incidents like
                deaths, fires, and other stigmatized events). We are not trying to make money from this — just a
                smoother tool for ourselves and anyone else who finds it helpful. Basemap: OpenFreeMap / OpenStreetMap.
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                We do not own the underlying data; it comes from Oshimaland. If the site owner does not want this proxy
                to use that data, please{" "}
                <a
                  className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
                  href={`${GITHUB_REPO_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer">
                  contact us on GitHub
                </a>{" "}
                and we will take it down. Source is open on{" "}
                <a
                  className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer">
                  GitHub
                </a>
                {" — you're welcome to use it; we're happy to share."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex max-w-md items-start gap-2">
          <div className="min-w-0 flex-1">{search}</div>
          {locationControl}
        </div>
        {locationUnsupported ? (
          <p className="text-xs text-[var(--ember)]">
            This browser doesn't support location lookup, so the map can't center on you automatically.
          </p>
        ) : null}
      </div>
    </header>
  )
}

type LocationControlProps = {
  readonly fetching: boolean
  readonly errorMessage: string | null
  readonly deniedHint: boolean
  readonly onRequest: () => void
}

export function LocationControl({ fetching, errorMessage, deniedHint, onRequest }: LocationControlProps) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
      <button
        type="button"
        title="Center map on my location"
        aria-label="Center map on my location"
        aria-busy={fetching}
        aria-haspopup="dialog"
        className="oshima-panel flex size-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-sm backdrop-blur hover:text-[var(--ember)] disabled:opacity-50"
        onClick={onRequest}
        disabled={fetching}>
        {fetching ? (
          <span
            className="size-3.5 animate-spin rounded-full border border-[var(--muted)] border-t-[var(--ink)]"
            aria-hidden="true"
          />
        ) : (
          <LocationCrosshairIcon className="size-4" />
        )}
      </button>
      {errorMessage ? (
        <p className="max-w-28 text-center text-[0.65rem] leading-snug text-[var(--ember)]">{errorMessage}</p>
      ) : null}
      {deniedHint && !errorMessage ? (
        <p className="max-w-28 text-center text-[0.65rem] leading-snug text-[var(--muted)]">
          Location access denied — tap to try again
        </p>
      ) : null}
    </div>
  )
}

export function MapStatusBanner({ kind }: { readonly kind: "loading" | "empty" | "error" | null }) {
  if (!kind) return null
  const message =
    kind === "loading"
      ? "Loading properties…"
      : kind === "empty"
        ? "No reported properties in view. Try zooming out or searching a place."
        : "Couldn't load properties for this area. Check your connection and try moving the map again."
  const tone = kind === "error" ? "text-[var(--ember)]" : "text-[var(--muted)]"
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] flex -translate-y-1/2 justify-center px-4">
      <p
        className={`oshima-panel max-w-xs border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-center text-sm shadow-sm backdrop-blur ${tone}`}>
        {message}
      </p>
    </div>
  )
}

export function MapAttribution() {
  return (
    <footer className="oshima-attrib pointer-events-none absolute inset-x-0 bottom-0 z-[900] flex justify-start p-2 md:p-3">
      <div className="pointer-events-auto max-w-[calc(100%-1rem)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[0.65rem] leading-snug text-[var(--muted)] shadow-sm backdrop-blur">
        <p className="mb-1">Independent viewer, not affiliated with Oshimaland or OpenFreeMap.</p>
        <p>
          Data ©{" "}
          <a
            className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
            href="https://www.oshimaland.com/"
            target="_blank"
            rel="noreferrer">
            Oshimaland
          </a>
          {" · "}
          <a
            className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
            href="https://www.oshimaland.co.jp/"
            target="_blank"
            rel="noreferrer">
            oshimaland.co.jp
          </a>
          <span className="mx-1.5 text-[var(--line)]">|</span>
          Map ©{" "}
          <a
            className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            href="https://openfreemap.org/"
            target="_blank"
            rel="noreferrer">
            OpenFreeMap
          </a>
          {" / "}
          <a
            className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer">
            OSM
          </a>
        </p>
      </div>
    </footer>
  )
}
