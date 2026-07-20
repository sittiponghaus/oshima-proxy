type IconProps = {
  readonly className?: string
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function LocationCrosshairIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.5v4.5M12 17v4.5M2.5 12h4.5M17 12h4.5" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.05 5.05l1.75 1.75M17.2 17.2l1.75 1.75M18.95 5.05l-1.75 1.75M6.8 17.2l-1.75 1.75" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true">
      <path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5 7.5 7.5 0 1 0 18.5 14.5Z" />
    </svg>
  )
}

export function Spinner({ className = "size-3.5" }: IconProps) {
  return (
    <span
      className={`animate-spin rounded-full border border-[var(--muted)] border-t-[var(--ink)] ${className}`}
      aria-hidden="true"
    />
  )
}
