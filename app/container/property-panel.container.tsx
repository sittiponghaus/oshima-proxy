import { PropertyPanelView } from "@/app/component/property-panel.component"
import { LoadStatus } from "@/app/config/load-status"
import {
  loadPropertyDetail,
  propertyContributeUrl,
  propertyLoadErrorFromCause,
  propertySourceUrl,
  type MapMarker,
  type PropertyLoadState
} from "@/app/usecase/property.usecase"
import { Effect } from "effect"
import { useEffect, useEffectEvent, useState } from "react"

type Props = {
  readonly marker: MapMarker
  readonly onClose: () => void
}

/** Property panel logic — calls usecase only. */
export function PropertyPanel({ marker, onClose }: Props) {
  const [state, setState] = useState<PropertyLoadState>({ status: LoadStatus.Loading })
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(() => new Set())
  const onCloseEvent = useEffectEvent(onClose)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseEvent()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setState({ status: LoadStatus.Loading })
    setBrokenImages(new Set())

    void Effect.runPromise(loadPropertyDetail(marker.key))
      .then((detail) => {
        if (cancelled) return
        setState({ status: LoadStatus.Ready, detail })
      })
      .catch((cause) => {
        if (cancelled) return
        setState(propertyLoadErrorFromCause(marker.key, cause))
      })

    return () => {
      cancelled = true
    }
  }, [marker.key])

  const sourceUrl =
    state.status === LoadStatus.Ready
      ? state.detail.sourceUrl
      : state.status === LoadStatus.Error
        ? state.sourceUrl
        : propertySourceUrl(marker.key)
  const contributeUrl =
    state.status === LoadStatus.Ready
      ? state.detail.contributeUrl
      : state.status === LoadStatus.Error
        ? state.contributeUrl
        : propertyContributeUrl()

  const detail = state.status === LoadStatus.Ready ? state.detail : null
  const visibleImages = detail?.images.filter((img) => !brokenImages.has(img.url)) ?? []

  return (
    <PropertyPanelView
      marker={marker}
      state={state}
      sourceUrl={sourceUrl}
      contributeUrl={contributeUrl}
      detail={detail}
      visibleImages={visibleImages}
      onClose={onClose}
      onImageError={(url) => {
        setBrokenImages((prev) => {
          const next = new Set(prev)
          next.add(url)
          return next
        })
      }}
    />
  )
}
