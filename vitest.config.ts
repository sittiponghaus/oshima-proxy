import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    // Mirror tsconfig paths: `@/*` → `./*`, `package.json` → `./package.json`
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      { find: "package.json", replacement: path.join(root, "package.json") }
    ]
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.test.ts", "server/**/*.test.ts", "shared/**/*.test.ts", "test/**/*.test.ts"]
  }
})
