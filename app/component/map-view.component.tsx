import type { MapCluster, MapMarker } from "@/app/usecase/map-tile.usecase"
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre"
import type { RefObject } from "react"

const MAPLIBRE_CSS_ID = "maplibre-gl-css"
const MAPLIBRE_CSS_HREF = "/maplibre-gl.css"

/** Load MapLibre CSS with the map chunk — keep it off the critical HTML path. */
function ensureMaplibreCss(): void {
  if (document.getElementById(MAPLIBRE_CSS_ID)) return
  const link = document.createElement("link")
  link.id = MAPLIBRE_CSS_ID
  link.rel = "stylesheet"
  link.href = MAPLIBRE_CSS_HREF
  document.head.appendChild(link)
}

ensureMaplibreCss()

type Props = {
  readonly mapRef: RefObject<MapRef | null>
  readonly initialViewState: {
    readonly longitude: number
    readonly latitude: number
    readonly zoom: number
  }
  readonly mapStyle: string
  readonly markers: readonly MapMarker[]
  readonly clusters: readonly MapCluster[]
  readonly activeMarkerKey: string | null
  readonly onLoad: () => void
  readonly onMoveEnd: () => void
  readonly onMapClick: () => void
  readonly onMarkerClick: (event: { originalEvent: MouseEvent }, marker: MapMarker) => void
  readonly onClusterClick: (event: { originalEvent: MouseEvent }, cluster: MapCluster) => void
}

/** MapLibre surface + marker/cluster markers (no data loading). */
export function MapView({
  mapRef,
  initialViewState,
  mapStyle,
  markers,
  clusters,
  activeMarkerKey,
  onLoad,
  onMoveEnd,
  onMapClick,
  onMarkerClick,
  onClusterClick
}: Props) {
  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      onLoad={onLoad}
      onMoveEnd={onMoveEnd}
      onClick={onMapClick}>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.cluster_key}
          longitude={cluster.longitude}
          latitude={cluster.latitude}
          anchor="center"
          onClick={(event) => onClusterClick(event, cluster)}>
          <div className="oshima-cluster" title={`${cluster.count} properties — click to zoom in`}>
            {cluster.count}
          </div>
        </Marker>
      ))}

      {markers.map((marker) => {
        const active = marker.key === activeMarkerKey
        return (
          <Marker
            key={marker.key}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="center"
            onClick={(event) => onMarkerClick(event, marker)}>
            <div
              className={active ? "oshima-marker oshima-marker--active" : "oshima-marker"}
              title={active ? "Selected property" : "Reported property — click for details"}
              aria-current={active ? "true" : undefined}
              aria-hidden="true">
              🔥
            </div>
          </Marker>
        )
      })}
    </Map>
  )
}
