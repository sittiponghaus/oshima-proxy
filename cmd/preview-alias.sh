#!/usr/bin/env sh
# Sanitize a git branch name into a Workers preview alias / tag.
# Matches wrangler: non [a-zA-Z0-9-] → -, collapse dashes, trim, lower-case.
set -eu

raw="${1:-}"
if [ -z "$raw" ]; then
  raw="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi

if [ -z "$raw" ] || [ "$raw" = "HEAD" ]; then
  echo "usage: cmd/preview-alias.sh <branch-name>" >&2
  exit 1
fi

# shellcheck disable=SC2001
alias="$(printf '%s' "$raw" | sed -E 's/[^a-zA-Z0-9-]+/-/g; s/-+/-/g; s/^-+//; s/-+$//;')"
alias="$(printf '%s' "$alias" | tr '[:upper:]' '[:lower:]')"

# Must start with a letter (Workers alias rules).
case "$alias" in
  [a-z]*) ;;
  *)
    echo "preview alias must start with a letter (got: $alias)" >&2
    exit 1
    ;;
esac

# DNS label budget: alias + "-" + worker name ≤ 63. Worker name is "oshima" (6).
worker_name="oshima"
max=$((63 - 1 - ${#worker_name}))
if [ "${#alias}" -gt "$max" ]; then
  alias="$(printf '%s' "$alias" | cut -c1-"$max" | sed -E 's/-+$//')"
fi

printf '%s\n' "$alias"
