import { useEffect, useId, useRef } from "react"

type Props = {
  readonly open: boolean
  readonly onAllow: () => void
  readonly onCancel: () => void
}

/** Location consent dialog UI (native `<dialog>` — no domain logic). */
export function LocationConsentDialog({ open, onAllow, onCancel }: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="oshima-panel fixed inset-0 z-[2000] m-auto w-[calc(100%-2rem)] max-w-sm border border-[var(--line)] bg-[var(--panel)] p-5 shadow-lg backdrop-blur open:block backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}>
      <button
        type="button"
        aria-label="Close"
        className="absolute top-3 right-3 flex size-7 items-center justify-center border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
        onClick={onCancel}>
        <span aria-hidden="true">×</span>
      </button>
      <p className="pr-8 text-[0.7rem] font-semibold tracking-[0.18em] text-[var(--ember)] uppercase">location</p>
      <h2 id={titleId} className="mt-2 pr-8 text-lg font-semibold tracking-tight text-[var(--ink)]">
        Center the map near you?
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        <span className="text-[var(--ink)]">What we access:</span> your current coordinates, via your browser's built-in
        Geolocation prompt — only when you tap "Allow" below.
        <br />
        <span className="mt-1.5 inline-block text-[var(--ink)]">What we don't do:</span> send, store, or log your
        position anywhere. It's used once, on this device, to fly the map to your area.
      </p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          className="border border-[var(--line)] bg-transparent px-3.5 py-2 text-sm text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="border border-[var(--ember)] bg-[var(--ember)] px-3.5 py-2 text-sm font-medium text-[#1a120c] hover:bg-[var(--ember-soft)] hover:border-[var(--ember-soft)]"
          onClick={onAllow}>
          Allow
        </button>
      </div>
    </dialog>
  )
}
