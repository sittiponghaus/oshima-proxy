import { rm } from "node:fs/promises"
import path from "node:path"

import tailwind from "bun-plugin-tailwind"

const outdir = path.join(process.cwd(), "dist")
await rm(outdir, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: ["./app/entrypoint.html"],
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
})

if (!result.success) {
  console.error("Build failed")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

for (const output of result.outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`)
}

const faviconSrc = path.join(process.cwd(), "public", "favicon.svg")
const faviconDest = path.join(outdir, "favicon.svg")
await Bun.write(faviconDest, Bun.file(faviconSrc))
console.log(
  ` ${path.relative(process.cwd(), faviconDest)}  ${((await Bun.file(faviconDest).size) / 1024).toFixed(1)} KB`
)

const headersSrc = path.join(process.cwd(), "public", "_headers")
const headersDest = path.join(outdir, "_headers")
await Bun.write(headersDest, Bun.file(headersSrc))
console.log(` ${path.relative(process.cwd(), headersDest)}`)

// Workers Assets SPA expects index.html
const entryHtml = path.join(outdir, "entrypoint.html")
const indexHtml = path.join(outdir, "index.html")
if (await Bun.file(entryHtml).exists()) {
  await Bun.write(indexHtml, Bun.file(entryHtml))
  console.log(` ${path.relative(process.cwd(), indexHtml)}  (SPA index)`)
}
