#!/usr/bin/env sh
# Delete a Workers Preview for a git branch (or explicit name).
#
# Use after the git branch is deleted — pass the branch name explicitly:
#   bun run preview:delete -- refactor/effect-first-workers
#
# Defaults to the current git branch when run from a checkout.
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

raw="${1:-}"
if [ -z "$raw" ]; then
  raw="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi

if [ -z "$raw" ] || [ "$raw" = "HEAD" ]; then
  echo "usage: bun run preview:delete -- <branch-or-preview-name>" >&2
  echo "Pass the branch name explicitly when the git branch is already deleted." >&2
  exit 1
fi

# Workers Builds / wrangler preview use the git branch string as the Preview name.
# --preview-alias uploads use the sanitized form — try both if they differ.
alias="$("$root/cmd/preview-alias.sh" "$raw")"

echo "Deleting Workers Preview \"$raw\" (worker: oshima)…"
if bunx wrangler preview delete --name "$raw" -y; then
  echo "Deleted preview \"$raw\"."
else
  status=$?
  if [ "$alias" != "$raw" ]; then
    echo "Retrying with sanitized alias \"$alias\"…"
    bunx wrangler preview delete --name "$alias" -y
    echo "Deleted preview \"$alias\"."
  else
    exit "$status"
  fi
fi
