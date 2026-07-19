import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { LocationConsentDialog } from "./location-consent-dialog";
import { PropertyPanel } from "./property-panel";
import { SearchBox, type PlaceResult } from "./search-box";
import {
  LocationErrorReason,
  RequestLocationState,
  useUserGeolocation,
  type LocationPermissionError,
  type UserLocation,
} from "./use-geolocation";
import { readStoredViewport, writeStoredViewport } from "../lib/map-viewport-storage";
import { GITHUB_REPO_URL, OSHIMALAND_SITE_URL } from "../lib/site";
import {
  applyThemeToDocument,
  mapStyleForTheme,
  resolveTheme,
  writeStoredTheme,
  type Theme,
} from "../lib/theme-storage";
import { runFetchMapTiles } from "../../shared/oshima/client";
import {
  flattenClusters,
  flattenMarkers,
  type MapCluster,
  type MapMarker,
} from "../../shared/oshima/schema";
import { oshimaTileZoom, quadkeysForBounds } from "../../shared/oshima/quadkey";

const DEFAULT_VIEW_STATE = {
  longitude: -73.95,
  latitude: 40.77,
  zoom: 12,
};

type Viewport = {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
  zoom: number;
};

/** Rewrites geolocation TaggedError reasons into shorter, friendlier UI copy. */
function locationErrorCopy(error: LocationPermissionError): string {
  switch (error.reason) {
    case LocationErrorReason.Denied:
      return "Location access denied — check your browser settings";
    case LocationErrorReason.Unavailable:
      return "Your location couldn't be determined";
    case LocationErrorReason.Timeout:
      return "Location request timed out — try again";
    case LocationErrorReason.Unsupported:
      return "Not supported by this browser";
    default:
      return error.message;
  }
}

function viewportFromMap(map: MaplibreMap): Viewport {
  const b = map.getBounds();
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  return {
    ne: { lat: ne.lat, lng: ne.lng },
    sw: { lat: sw.lat, lng: sw.lng },
    zoom: map.getZoom(),
  };
}

export function App() {
  const mapRef = useRef<MapRef>(null);
  const initialViewState = useMemo(() => readStoredViewport() ?? DEFAULT_VIEW_STATE, []);
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = resolveTheme();
    applyThemeToDocument(initial);
    return initial;
  });
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [clusters, setClusters] = useState<MapCluster[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  // Collapsed by default on mobile; desktop (md+) starts expanded.
  const [aboutOpen, setAboutOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      // Desktop: expanded by default. Mobile: collapsed by default.
      setAboutOpen(mq.matches);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      writeStoredTheme(next);
      return next;
    });
  }, []);

  const mapStyle = useMemo(() => mapStyleForTheme(theme), [theme]);

  // Stable signature so deep zoom inside the same z≤16 tiles does not refetch
  // (Oshimaland skips when prevTileBounds still contains the view).
  const keysSignature = useMemo(() => {
    if (!viewport) return "";
    const zoom = oshimaTileZoom(viewport.zoom);
    return quadkeysForBounds(viewport.ne, viewport.sw, zoom).join("\0");
  }, [viewport]);

  useEffect(() => {
    if (!keysSignature) return;
    const keys = keysSignature.split("\0");

    let cancelled = false;
    setStatus("loading");

    const handle = setTimeout(() => {
      void runFetchMapTiles({ keys })
        .then((response) => {
          if (cancelled) return;
          setMarkers(flattenMarkers(response));
          setClusters(flattenClusters(response));
          setStatus("ready");
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [keysSignature]);

  const syncViewport = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setViewport(viewportFromMap(map));
    const center = map.getCenter();
    writeStoredViewport({
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.getZoom(),
    });
  }, []);

  const flyToPlace = useCallback((place: PlaceResult) => {
    mapRef.current?.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 1400,
    });
  }, []);

  const flyToUserLocation = useCallback((location: UserLocation) => {
    mapRef.current?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 1400,
    });
  }, []);

  const {
    requestState,
    error: locationError,
    isFetching: locationFetching,
    showControl: showLocationControl,
    requestLocation,
  } = useUserGeolocation({ onLocated: flyToUserLocation });

  const openLocationConsent = useCallback(() => {
    if (requestState === RequestLocationState.ALLOWED) {
      requestLocation();
      return;
    }
    setLocationConsentOpen(true);
  }, [requestLocation, requestState]);

  const allowLocation = useCallback(() => {
    setLocationConsentOpen(false);
    requestLocation();
  }, [requestLocation]);

  const cancelLocationConsent = useCallback(() => {
    setLocationConsentOpen(false);
  }, []);

  const onMarkerClick = useCallback((event: { originalEvent: MouseEvent }, marker: MapMarker) => {
    event.originalEvent.stopPropagation();
    setSelected(marker);
  }, []);

  const onClusterClick = useCallback(
    (event: { originalEvent: MouseEvent }, cluster: MapCluster) => {
      event.originalEvent.stopPropagation();
      const map = mapRef.current;
      if (!map) return;
      // Peel ~one cluster layer per click; allow full map depth (tiles stay at z≤16).
      const maxZoom = Math.min(map.getZoom() + 2, map.getMaxZoom());
      map.fitBounds(
        [
          [cluster.min_longitude, cluster.min_latitude],
          [cluster.max_longitude, cluster.max_latitude],
        ],
        { padding: 48, maxZoom, duration: 900 },
      );
    },
    [],
  );

  const isFirstLoad = markers.length === 0 && clusters.length === 0;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--paper)]">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[1000] p-3 md:p-4">
        <div className="pointer-events-auto flex w-full flex-col gap-2">
          <div className="oshima-panel border border-[var(--line)] bg-[var(--panel)] shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3 px-3 py-2 md:px-4 md:py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h1 className="text-base font-semibold tracking-tight md:text-lg">
                    🔥
                  </h1>
                  <p className="text-xs text-[var(--muted)] md:text-sm">
                    <a
                      className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
                      href={OSHIMALAND_SITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <SunIcon className="size-4" />
                  ) : (
                    <MoonIcon className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-medium tracking-wide text-[var(--ember)] uppercase hover:underline"
                  aria-expanded={aboutOpen}
                  aria-controls="ol-proxy-about"
                  onClick={() => setAboutOpen((open) => !open)}
                >
                  {aboutOpen ? "Less" : "About"}
                  <ChevronIcon className={`size-3 transition-transform ${aboutOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
            {aboutOpen ? (
              <div
                id="ol-proxy-about"
                className="border-t border-[var(--line)] px-3 pb-2.5 pt-2 md:px-4"
              >
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  This page uses data from{" "}
                  <a
                    className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
                    href={OSHIMALAND_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Oshimaland
                  </a>
                  {" ("}
                  <a
                    className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
                    href="https://www.oshimaland.co.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    JP
                  </a>
                  {
                    ") and tries to make browsing it a bit smoother — a clearer map and a live viewer for properties with reported incidents (deaths, fires, and other stigmatized events). We're just aiming for a nicer experience on top of the official site. Basemap: OpenFreeMap / OpenStreetMap. Source is open on "
                  }
                  <a
                    className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  {
                    " — you're welcome to use it. If the Oshimaland site owner asks us to take this down, we'll follow that request."
                  }
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex max-w-md items-start gap-2">
            <div className="min-w-0 flex-1">
              <SearchBox onSelect={flyToPlace} />
            </div>
            {showLocationControl ? (
              <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                <button
                  type="button"
                  title="Center map on my location"
                  aria-label="Center map on my location"
                  aria-busy={locationFetching}
                  aria-haspopup="dialog"
                  className="oshima-panel flex size-9 items-center justify-center border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-sm backdrop-blur hover:text-[var(--ember)] disabled:opacity-50"
                  onClick={openLocationConsent}
                  disabled={locationFetching}
                >
                  {locationFetching ? (
                    <span
                      className="size-3.5 animate-spin rounded-full border border-[var(--muted)] border-t-[var(--ink)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <LocationCrosshairIcon className="size-4" />
                  )}
                </button>
                {locationError ? (
                  <p className="max-w-28 text-center text-[0.65rem] leading-snug text-[var(--ember)]">
                    {locationErrorCopy(locationError)}
                  </p>
                ) : null}
                {requestState === RequestLocationState.NOT_ALLOWED && !locationError ? (
                  <p className="max-w-28 text-center text-[0.65rem] leading-snug text-[var(--muted)]">
                    Location access denied — tap to try again
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {requestState === RequestLocationState.UNSUPPORTED ? (
            <p className="text-xs text-[var(--ember)]">
              This browser doesn't support location lookup, so the map can't center on you
              automatically.
            </p>
          ) : null}
        </div>
      </header>

      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        onLoad={syncViewport}
        onMoveEnd={syncViewport}
        onClick={() => setSelected(null)}
      >
        {clusters.map((cluster) => (
          <Marker
            key={cluster.cluster_key}
            longitude={cluster.longitude}
            latitude={cluster.latitude}
            anchor="center"
            onClick={(event) => onClusterClick(event, cluster)}
          >
            <div
              className="oshima-cluster"
              title={`${cluster.count} properties — click to zoom in`}
            >
              {cluster.count}
            </div>
          </Marker>
        ))}

        {markers.map((marker) => (
          <Marker
            key={marker.key}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="center"
            onClick={(event) => onMarkerClick(event, marker)}
          >
            <div
              className="oshima-marker"
              title="Reported property — click for details"
              aria-hidden="true"
            >
              🔥
            </div>
          </Marker>
        ))}
      </Map>

      {isFirstLoad && status === "loading" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] flex -translate-y-1/2 justify-center px-4">
          <p className="oshima-panel border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-center text-sm text-[var(--muted)] shadow-sm backdrop-blur">
            Loading properties…
          </p>
        </div>
      ) : null}

      {isFirstLoad && status === "ready" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] flex -translate-y-1/2 justify-center px-4">
          <p className="oshima-panel max-w-xs border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-center text-sm text-[var(--muted)] shadow-sm backdrop-blur">
            No reported properties in view. Try zooming out or searching a place.
          </p>
        </div>
      ) : null}

      {isFirstLoad && status === "error" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] flex -translate-y-1/2 justify-center px-4">
          <p className="oshima-panel max-w-xs border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-center text-sm text-[var(--ember)] shadow-sm backdrop-blur">
            Couldn't load properties for this area. Check your connection and try moving the map
            again.
          </p>
        </div>
      ) : null}

      {selected ? <PropertyPanel marker={selected} onClose={() => setSelected(null)} /> : null}

      <footer className="oshima-attrib pointer-events-none absolute inset-x-0 bottom-0 z-[900] flex justify-start p-2 md:p-3">
        <div className="pointer-events-auto max-w-[calc(100%-1rem)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[0.65rem] leading-snug text-[var(--muted)] shadow-sm backdrop-blur">
          <p className="mb-1">Independent viewer, not affiliated with Oshimaland or OpenFreeMap.</p>
          <p>
            Data ©{" "}
            <a
              className="text-[var(--ink)] underline-offset-2 hover:text-[var(--ember)] hover:underline"
              href="https://www.oshimaland.com/"
              target="_blank"
              rel="noreferrer"
            >
              Oshimaland
            </a>
            {" · "}
            <a
              className="underline-offset-2 hover:text-[var(--ember)] hover:underline"
              href="https://www.oshimaland.co.jp/"
              target="_blank"
              rel="noreferrer"
            >
              oshimaland.co.jp
            </a>
            <span className="mx-1.5 text-[var(--line)]">|</span>
            Map ©{" "}
            <a
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
              href="https://openfreemap.org/"
              target="_blank"
              rel="noreferrer"
            >
              OpenFreeMap
            </a>
            {" / "}
            <a
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline"
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OSM
            </a>
          </p>
        </div>
      </footer>

      <LocationConsentDialog
        open={locationConsentOpen}
        onAllow={allowLocation}
        onCancel={cancelLocationConsent}
      />
    </div>
  );
}

function ChevronIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function LocationCrosshairIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.5v4.5M12 17v4.5M2.5 12h4.5M17 12h4.5" />
    </svg>
  );
}

function SunIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.05 5.05l1.75 1.75M17.2 17.2l1.75 1.75M18.95 5.05l-1.75 1.75M6.8 17.2l-1.75 1.75" />
    </svg>
  );
}

function MoonIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5 7.5 7.5 0 1 0 18.5 14.5Z" />
    </svg>
  );
}
