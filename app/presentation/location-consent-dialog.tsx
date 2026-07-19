import { useEffect, useId, useRef } from "react";

type LocationConsentDialogProps = {
  readonly open: boolean;
  readonly onAllow: () => void;
  readonly onCancel: () => void;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LocationConsentDialog({ open, onAllow, onCancel }: LocationConsentDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables[0];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;

      const firstNode = nodes[0]!;
      const lastNode = nodes[nodes.length - 1]!;

      if (event.shiftKey) {
        if (document.activeElement === firstNode) {
          event.preventDefault();
          lastNode.focus();
        }
      } else if (document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-[var(--scrim)] backdrop-blur-[2px]"
        aria-label="Dismiss location consent"
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="oshima-panel relative w-full max-w-sm border border-[var(--line)] bg-[var(--panel)] p-5 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 flex size-7 items-center justify-center border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          onClick={onCancel}
        >
          <span aria-hidden="true">×</span>
        </button>
        <p className="pr-8 text-[0.7rem] font-semibold tracking-[0.18em] text-[var(--ember)] uppercase">
          location
        </p>
        <h2
          id={titleId}
          className="mt-2 pr-8 text-lg font-semibold tracking-tight text-[var(--ink)]"
        >
          Center the map near you?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          <span className="text-[var(--ink)]">What we access:</span> your current coordinates, via
          your browser's built-in Geolocation prompt — only when you tap "Allow" below.
          <br />
          <span className="mt-1.5 inline-block text-[var(--ink)]">What we don't do:</span> send,
          store, or log your position anywhere. It's used once, on this device, to fly the map to
          your area.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="border border-[var(--line)] bg-transparent px-3.5 py-2 text-sm text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="border border-[var(--ember)] bg-[var(--ember)] px-3.5 py-2 text-sm font-medium text-[#1a120c] hover:bg-[var(--ember-soft)] hover:border-[var(--ember-soft)]"
            onClick={onAllow}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
