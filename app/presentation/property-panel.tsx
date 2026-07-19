import { useEffect, useRef, useState } from "react";

import { OshimaPropertyError, runFetchProperty } from "../../shared/oshima/client";
import {
  propertyContributeUrl,
  propertySourceUrl,
  type MapMarker,
  type PropertyDetail,
} from "../../shared/oshima/schema";

type Props = {
  readonly marker: MapMarker;
  readonly onClose: () => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; detail: PropertyDetail }
  | {
      status: "error";
      message: string;
      cloudflare: boolean;
      sourceUrl: string;
      contributeUrl: string;
    };

export function PropertyPanel({ marker, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(() => new Set());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setBrokenImages(new Set());

    void runFetchProperty(marker.key)
      .then((detail) => {
        if (cancelled) return;
        setState({ status: "ready", detail });
      })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof OshimaPropertyError) {
          setState({
            status: "error",
            message: cause.message,
            cloudflare: cause.cloudflare === true,
            sourceUrl: cause.sourceUrl ?? propertySourceUrl(marker.key),
            contributeUrl: cause.contributeUrl ?? propertyContributeUrl(),
          });
          return;
        }
        setState({
          status: "error",
          message: cause instanceof Error ? cause.message : String(cause),
          cloudflare: false,
          sourceUrl: propertySourceUrl(marker.key),
          contributeUrl: propertyContributeUrl(),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [marker.key]);

  const sourceUrl =
    state.status === "ready"
      ? state.detail.sourceUrl
      : state.status === "error"
        ? state.sourceUrl
        : propertySourceUrl(marker.key);
  const contributeUrl =
    state.status === "ready"
      ? state.detail.contributeUrl
      : state.status === "error"
        ? state.contributeUrl
        : propertyContributeUrl();

  const detail = state.status === "ready" ? state.detail : null;
  const visibleImages = detail?.images.filter((img) => !brokenImages.has(img.url)) ?? [];

  return (
    <aside
      className="oshima-panel absolute right-4 bottom-4 z-[1000] flex max-h-[min(70vh,36rem)] w-[22rem] max-w-[calc(100%-2rem)] flex-col border border-[var(--line)] bg-[var(--panel)] shadow-lg backdrop-blur"
      role="dialog"
      aria-label="Reported property details"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[var(--ember)] uppercase">
            Reported property
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--ink)]">
            {detail?.address ?? "Address unavailable"}
          </p>
          <p className="mt-0.5 font-mono text-[0.65rem] text-[var(--muted)]">{marker.key}</p>
        </div>
        <button
          type="button"
          aria-label="Close property details"
          className="flex size-7 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {state.status === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span
              className="size-3.5 animate-spin rounded-full border border-[var(--muted)] border-t-[var(--ink)]"
              aria-hidden="true"
            />
            Loading report…
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="space-y-3 text-sm">
            {state.cloudflare ? (
              <>
                <p className="text-[var(--ember)]">
                  Full report blocked by Cloudflare from this local proxy.
                </p>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Oshimaland only exposes property JSON at{" "}
                  <code className="text-[var(--ink)]">/d_en/{"{key}"}.json</code> (and JP{" "}
                  <code className="text-[var(--ink)]">/d/</code>) — not on the map API host. Open
                  the report on their site, or set <code className="text-[var(--ink)]">OSHIMA_COOKIE</code>{" "}
                  from a browser session (see README).
                </p>
                <a
                  className="inline-flex w-full items-center justify-center border border-[var(--ember)] bg-[var(--ember)] px-3 py-2.5 text-sm font-medium text-[#1a120c] hover:bg-[var(--ember-soft)]"
                  href={state.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full report on Oshimaland
                </a>
                <a
                  className="inline-flex w-full items-center justify-center border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[var(--ember)] hover:text-[var(--ember)]"
                  href={state.contributeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Post on Oshimaland
                </a>
                <p className="text-[0.65rem] text-[var(--muted)] leading-relaxed">
                  On their map: zoom in fully, right-click, then choose “Post a Stigmatized Property.”
                </p>
              </>
            ) : (
              <p className="text-[var(--ember)]">{state.message}</p>
            )}
            <p className="text-xs text-[var(--muted)]">
              Marker {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)} (map API)
            </p>
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-4 text-sm">
            {detail.date ? (
              <section>
                <h2 className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Date
                </h2>
                <p className="mt-1 text-[var(--ink)]">{detail.date}</p>
              </section>
            ) : null}

            {detail.address ? (
              <section>
                <h2 className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Address
                </h2>
                <p className="mt-1 text-[var(--ink)]">{detail.address}</p>
              </section>
            ) : null}

            {detail.info ? (
              <section>
                <h2 className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Report
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-[var(--ink)] leading-relaxed">
                  {detail.info}
                </p>
              </section>
            ) : (
              <p className="text-xs text-[var(--muted)]">No report text in this record.</p>
            )}

            {detail.links.length > 0 ? (
              <section>
                <h2 className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Links
                </h2>
                <ul className="mt-1 space-y-1">
                  {detail.links.map((link) => (
                    <li key={link.uri}>
                      <a
                        className="text-[var(--ember)] underline-offset-2 hover:underline"
                        href={link.uri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {visibleImages.length > 0 ? (
              <section>
                <h2 className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Photos
                </h2>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {visibleImages.map((img) => (
                    <a
                      key={img.url}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-[var(--line)] bg-black/30"
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="max-h-28 w-full object-cover"
                        loading="lazy"
                        onError={() => {
                          setBrokenImages((prev) => {
                            const next = new Set(prev);
                            next.add(img.url);
                            return next;
                          });
                        }}
                      />
                    </a>
                  ))}
                </div>
                <p className="mt-1 text-[0.65rem] text-[var(--muted)]">
                  Photos may fail if Cloudflare blocks the static host.
                </p>
              </section>
            ) : null}

            <p className="text-xs text-[var(--muted)]">
              {(detail.lat ?? marker.latitude).toFixed(5)},{" "}
              {(detail.lng ?? marker.longitude).toFixed(5)}
              {detail.trusted ? " · trusted" : null}
            </p>
          </div>
        ) : null}

        {state.status !== "error" || !state.cloudflare ? (
          <section className="mt-4 border-t border-[var(--line)] pt-3">
            <h2 className="text-[0.7rem] font-semibold tracking-[0.16em] text-[var(--ember)] uppercase">
              Contribution
            </h2>
            {detail?.contribution ? (
              <p className="mt-2 text-sm text-[var(--ink)]">
                Posted on <span className="font-medium">{detail.contribution}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {state.status === "loading"
                  ? "Loading contributor credit…"
                  : "Contributor credit unavailable from this proxy."}
              </p>
            )}
            <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
              Reports are community-contributed on Oshimaland. View the original, or open their map
              to post a new one (right-click → “Post a Stigmatized Property”; zoom in fully first).
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                className="inline-flex items-center justify-center border border-[var(--ember)] bg-[var(--ember)] px-3 py-2 text-sm font-medium text-[#1a120c] hover:bg-[var(--ember-soft)]"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on Oshimaland
              </a>
              <a
                className="inline-flex items-center justify-center border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[var(--ember)] hover:text-[var(--ember)]"
                href={contributeUrl}
                target="_blank"
                rel="noreferrer"
              >
                Post on Oshimaland
              </a>
            </div>
          </section>
        ) : (
          <section className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Reports are community-contributed on Oshimaland. Use the buttons above to view a report
              or open their map to post (right-click → “Post a Stigmatized Property”).
            </p>
          </section>
        )}

        <p className="mt-3 text-[0.65rem] text-[var(--muted)]">
          Data from{" "}
          <a
            className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
            href="https://www.oshimaland.com/"
            target="_blank"
            rel="noreferrer"
          >
            Oshimaland
          </a>
        </p>
      </div>
    </aside>
  );
}
