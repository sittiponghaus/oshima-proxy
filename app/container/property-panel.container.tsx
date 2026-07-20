import { PhotoLightboxDialog } from "@/app/component/photo-lightbox-dialog.component"
import { PropertyPanelView, type TranslationUiState } from "@/app/component/property-panel.component"
import { LoadStatus } from "@/app/config/load-status"
import { useTranslator } from "@/app/hook/translation.hook"
import { propertyDetailQueryOptions } from "@/app/query/domain.query"
import {
  propertyContributeUrl,
  propertyLoadErrorFromCause,
  propertySourceUrl,
  type MapMarker,
  type PropertyLoadState
} from "@/app/usecase/property.usecase"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"

type Props = {
  readonly marker: MapMarker
  readonly onClose: () => void
}

/** Property panel logic — calls hooks / queries only. */
export function PropertyPanel({ marker, onClose }: Props) {
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(() => new Set())
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [translation, setTranslation] = useState<TranslationUiState>({ status: "idle" })
  const translationRequestIdRef = useRef(0)
  const { showControl: showTranslate, translate, isTranslationError } = useTranslator()
  const onCloseEvent = useEffectEvent(onClose)

  const propertyQuery = useQuery(propertyDetailQueryOptions(marker.key))

  const state: PropertyLoadState = useMemo(() => {
    // Use isPending (no data yet), not isFetching — keep showing stale detail during background refetch.
    if (propertyQuery.isPending) {
      return { status: LoadStatus.Loading }
    }
    if (propertyQuery.isError) {
      return propertyLoadErrorFromCause(marker.key, propertyQuery.error)
    }
    if (propertyQuery.data) {
      return { status: LoadStatus.Ready, detail: propertyQuery.data }
    }
    return { status: LoadStatus.Loading }
  }, [marker.key, propertyQuery.data, propertyQuery.error, propertyQuery.isError, propertyQuery.isPending])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      // Lightbox owns Escape while open; otherwise close the panel.
      if (lightboxUrl != null) {
        setLightboxUrl(null)
        return
      }
      onCloseEvent()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [lightboxUrl])

  useEffect(() => {
    translationRequestIdRef.current += 1
    setBrokenImages(new Set())
    setLightboxUrl(null)
    setTranslation({ status: "idle" })
  }, [marker.key])

  const onTranslate = () => {
    if (translation.status === "ready") {
      setTranslation({
        status: "ready",
        text: translation.text,
        showing: translation.showing === "translation" ? "original" : "translation"
      })
      return
    }

    const info = state.status === LoadStatus.Ready ? state.detail.info : null
    if (!info) return

    const requestId = ++translationRequestIdRef.current
    setTranslation({ status: "loading" })
    void translate(info)
      .then((text) => {
        if (requestId !== translationRequestIdRef.current) return
        setTranslation({ status: "ready", text, showing: "translation" })
      })
      .catch((cause) => {
        if (requestId !== translationRequestIdRef.current) return
        const message = isTranslationError(cause)
          ? cause.message
          : cause instanceof Error && cause.message.length > 0
            ? cause.message
            : "Translation failed"
        setTranslation({ status: "error", message })
      })
  }

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
  const lightboxIndex = lightboxUrl ? visibleImages.findIndex((img) => img.url === lightboxUrl) : -1

  return (
    <>
      <PropertyPanelView
        marker={marker}
        state={state}
        sourceUrl={sourceUrl}
        contributeUrl={contributeUrl}
        detail={detail}
        visibleImages={visibleImages}
        translation={translation}
        showTranslate={showTranslate}
        onClose={onClose}
        onPhotoClick={setLightboxUrl}
        onTranslate={onTranslate}
        onImageError={(url) => {
          setBrokenImages((prev) => {
            const next = new Set(prev)
            next.add(url)
            return next
          })
          setLightboxUrl((current) => (current === url ? null : current))
        }}
      />
      {lightboxUrl ? (
        <PhotoLightboxDialog
          src={lightboxUrl}
          label={lightboxIndex >= 0 ? `Photo ${lightboxIndex + 1}` : "Photo"}
          onClose={() => setLightboxUrl(null)}
        />
      ) : null}
    </>
  )
}
