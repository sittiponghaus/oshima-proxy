import type { MapCluster, MapMarker } from "@/app/usecase/map-tile.usecase"
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre"
import type { RefObject } from "react"

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

      {markers.map((marker) => (
        <Marker
          key={marker.key}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="center"
          onClick={(event) => onMarkerClick(event, marker)}>
          <div className="oshima-marker" title="Reported property — click for details" aria-hidden="true">
            🔥
          </div>
        </Marker>
      ))}
    </Map>
  )
}
