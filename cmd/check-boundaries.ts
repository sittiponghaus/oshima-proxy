/**
 * Fail if `app/` imports `server/` (directly or via `@/server`).
 * Oxlint overrides do not reliably enforce no-restricted-imports for this path.
 */
import { Glob } from "bun"

const violations: string[] = []
const importRe = /(?:from\s+|import\s*\()\s*["'](@\/server(?:\/[^"']*)?|(?:\.\.\/)+server(?:\/[^"']*)?)["']/g

for await (const file of new Glob("app/**/*.{ts,tsx}").scan(".")) {
  const text = await Bun.file(file).text()
  for (const match of text.matchAll(importRe)) {
    violations.push(`${file}: ${match[1]}`)
  }
}

if (violations.length > 0) {
  console.error("app/ must not import server/:\n" + violations.map((v) => `  ${v}`).join("\n"))
  process.exit(1)
}

console.log("boundary ok: app/ does not import server/")
