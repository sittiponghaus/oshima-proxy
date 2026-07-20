import { useEffect, useId, useRef } from "react"

type Props = {
  readonly src: string
  readonly label: string
  readonly onClose: () => void
}

/** Full-size property photo viewer (native `<dialog>` — Escape / backdrop / close). */
export function PhotoLightboxDialog({ src, label, onClose }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="oshima-panel fixed inset-0 z-[3000] m-auto max-h-[min(92vh,56rem)] w-[min(96vw,56rem)] max-w-[calc(100%-1.5rem)] flex-col border border-[var(--line)] bg-[var(--panel)] p-0 shadow-lg backdrop-blur open:flex backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <p id={titleId} className="truncate text-[0.7rem] font-semibold tracking-[0.16em] text-[var(--ember)] uppercase">
          {label}
        </p>
        <button
          type="button"
          aria-label="Close photo"
          className="flex size-7 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black/40 p-3 sm:p-5">
        <img
          src={src}
          alt=""
          className="max-h-[min(80vh,48rem)] max-w-full object-contain"
          decoding="async"
        />
      </div>
    </dialog>
  )
}
