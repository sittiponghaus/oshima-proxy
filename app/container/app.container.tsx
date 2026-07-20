import { AppHeader, LocationControl, MapAttribution, MapStatusBanner } from "@/app/component/app-chrome.component"
import { LocationConsentDialog } from "@/app/component/location-consent-dialog.component"
import { MapView } from "@/app/component/map-view.component"
import { LoadStatus } from "@/app/config/load-status"

import "maplibre-gl/dist/maplibre-gl.css"

import { PropertyPanel } from "@/app/container/property-panel.container"
import { SearchBox } from "@/app/container/search-box.container"
import {
  RequestLocationState,
  locationErrorCopy,
  useUserGeolocation,
  type UserLocation
} from "@/app/hook/geolocation.hook"
import { useMapViewport } from "@/app/hook/map-viewport.hook"
import { useTheme } from "@/app/hook/theme.hook"
import { loadMapTile, mapTileKeySignature, type MapCluster, type MapMarker } from "@/app/usecase/map-tile.usecase"
import type { PlaceResult } from "@/app/usecase/place.usecase"
import { useDebounce } from "@uidotdev/usehooks"
import { type MapRef } from "@vis.gl/react-maplibre"
import { Effect } from "effect"
import type { Map as MaplibreMap } from "maplibre-gl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type Viewport = {
  ne: { lat: number; lng: number }
  sw: { lat: number; lng: number }
  zoom: number
}

function viewportFromMap(map: MaplibreMap): Viewport {
  const b = map.getBounds()
  const ne = b.getNorthEast()
  const sw = b.getSouthWest()
  return {
    ne: { lat: ne.lat, lng: ne.lng },
    sw: { lat: sw.lat, lng: sw.lng },
    zoom: map.getZoom()
  }
}

/** Root map app logic — calls hooks/usecases only; renders components. */
export function App() {
  const mapRef = useRef<MapRef>(null)
  const { setStoredViewport, initialViewState } = useMapViewport()
  const { theme, toggleTheme, mapStyle } = useTheme()
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [clusters, setClusters] = useState<MapCluster[]>([])
  const [status, setStatus] = useState<LoadStatus>(LoadStatus.Idle)
  const [selected, setSelected] = useState<MapMarker | null>(null)
  const [locationConsentOpen, setLocationConsentOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const keysSignature = useMemo(() => {
    if (!viewport) return ""
    return mapTileKeySignature(viewport)
  }, [viewport])
  const debouncedKeysSignature = useDebounce(keysSignature, 180)

  useEffect(() => {
    if (!debouncedKeysSignature) return

    let cancelled = false
    setStatus(LoadStatus.Loading)

    void Effect.runPromise(loadMapTile(debouncedKeysSignature))
      .then((result) => {
        if (cancelled) return
        setMarkers(result.markers)
        setClusters(result.clusters)
        setStatus(LoadStatus.Ready)
      })
      .catch(() => {
        if (cancelled) return
        setStatus(LoadStatus.Error)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedKeysSignature])

  const syncViewport = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    setViewport(viewportFromMap(map))
    const center = map.getCenter()
    setStoredViewport({
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.getZoom()
    })
  }, [setStoredViewport])

  const flyToPlace = useCallback((place: PlaceResult) => {
    mapRef.current?.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 1400
    })
  }, [])

  const flyToUserLocation = useCallback((location: UserLocation) => {
    mapRef.current?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 1400
    })
  }, [])

  const {
    requestState,
    location: userLocation,
    error: locationError,
    isFetching: locationFetching,
    showControl: showLocationControl,
    requestLocation
  } = useUserGeolocation()

  const lastFlownLocationKeyRef = useRef<string | null>(null)

  const requestLocationAndRefly = useCallback(() => {
    lastFlownLocationKeyRef.current = null
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    if (requestState !== RequestLocationState.ALLOWED) return
    if (!userLocation || locationFetching) return
    const key = `${userLocation.latitude},${userLocation.longitude}`
    if (lastFlownLocationKeyRef.current === key) return
    lastFlownLocationKeyRef.current = key
    flyToUserLocation(userLocation)
  }, [requestState, userLocation, locationFetching, flyToUserLocation])

  const openLocationConsent = useCallback(() => {
    if (requestState === RequestLocationState.ALLOWED) {
      requestLocationAndRefly()
      return
    }
    setLocationConsentOpen(true)
  }, [requestLocationAndRefly, requestState])

  const allowLocation = useCallback(() => {
    setLocationConsentOpen(false)
    requestLocationAndRefly()
  }, [requestLocationAndRefly])

  const cancelLocationConsent = useCallback(() => {
    setLocationConsentOpen(false)
  }, [])

  const onMarkerClick = useCallback((event: { originalEvent: MouseEvent }, marker: MapMarker) => {
    event.originalEvent.stopPropagation()
    setSelected(marker)
  }, [])

  const onClusterClick = useCallback((event: { originalEvent: MouseEvent }, cluster: MapCluster) => {
    event.originalEvent.stopPropagation()
    const map = mapRef.current
    if (!map) return
    const maxZoom = Math.min(map.getZoom() + 2, map.getMaxZoom())
    map.fitBounds(
      [
        [cluster.min_longitude, cluster.min_latitude],
        [cluster.max_longitude, cluster.max_latitude]
      ],
      { padding: 48, maxZoom, duration: 900 }
    )
  }, [])

  const isFirstLoad = markers.length === 0 && clusters.length === 0
  const statusKind =
    isFirstLoad && status === LoadStatus.Loading
      ? "loading"
      : isFirstLoad && status === LoadStatus.Ready
        ? "empty"
        : isFirstLoad && status === LoadStatus.Error
          ? "error"
          : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--paper)]">
      <AppHeader
        theme={theme}
        aboutOpen={aboutOpen}
        onToggleTheme={toggleTheme}
        onToggleAbout={() => setAboutOpen((open) => !open)}
        search={<SearchBox onSelect={flyToPlace} />}
        locationControl={
          showLocationControl ? (
            <LocationControl
              fetching={locationFetching}
              errorMessage={locationError ? locationErrorCopy(locationError) : null}
              deniedHint={requestState === RequestLocationState.NOT_ALLOWED}
              onRequest={openLocationConsent}
            />
          ) : null
        }
        locationUnsupported={requestState === RequestLocationState.UNSUPPORTED}
      />

      <MapView
        mapRef={mapRef}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        markers={markers}
        clusters={clusters}
        onLoad={syncViewport}
        onMoveEnd={syncViewport}
        onMapClick={() => setSelected(null)}
        onMarkerClick={onMarkerClick}
        onClusterClick={onClusterClick}
      />

      <MapStatusBanner kind={statusKind} />

      {selected ? <PropertyPanel marker={selected} onClose={() => setSelected(null)} /> : null}

      <MapAttribution />

      <LocationConsentDialog open={locationConsentOpen} onAllow={allowLocation} onCancel={cancelLocationConsent} />
    </div>
  )
}
