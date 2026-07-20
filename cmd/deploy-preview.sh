#!/usr/bin/env sh
# Upload a Workers version tagged + aliased to the current (or given) git branch.
# Preview URL: <alias>-oshima.<subdomain>.workers.dev
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

branch="${1:-}"
if [ -z "$branch" ]; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi

alias="$("$root/cmd/preview-alias.sh" "$branch")"

bun run build
exec bunx wrangler versions upload --tag "$alias" --preview-alias "$alias"
