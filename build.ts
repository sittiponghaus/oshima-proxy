import { rm } from "node:fs/promises"
import path from "node:path"

import tailwind from "bun-plugin-tailwind"

import { PAGE_DESCRIPTION, PAGE_TITLE } from "./app/config/site.ts"

const outdir = path.join(process.cwd(), "dist")
await rm(outdir, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: ["./app/config/entrypoint.tsx"],
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  splitting: true,
  sourcemap: "linked",
  naming: {
    entry: "[name]-[hash].[ext]",
    chunk: "chunk-[hash].[ext]",
    asset: "[name]-[hash].[ext]"
  },
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

const entryJs = result.outputs.find((output) => output.kind === "entry-point" && output.path.endsWith(".js"))
if (!entryJs) {
  console.error("Build failed: missing JS entry")
  process.exit(1)
}

const entryJsFile = path.basename(entryJs.path)
/** Critical CSS only — async chunk CSS (e.g. MapLibre) is injected when the map loads. */
const cssFiles = result.outputs
  .filter((output) => output.path.endsWith(".css") && path.basename(output.path).startsWith("entrypoint-"))
  .map((output) => path.basename(output.path))

if (cssFiles.length === 0) {
  console.error("Build failed: missing entry CSS")
  process.exit(1)
}

const entrySource = await Bun.file(entryJs.path).text()
const staticJsDeps = [
  ...new Set(
    [...entrySource.matchAll(/\bfrom\s*"(\.\/chunk-[^"]+\.js)"/g)].map((match) => path.basename(match[1]!))
  )
]

const faviconSrc = path.join(process.cwd(), "public", "favicon.svg")
const faviconDest = path.join(outdir, "favicon.svg")
await Bun.write(faviconDest, Bun.file(faviconSrc))
console.log(
  ` ${path.relative(process.cwd(), faviconDest)}  ${((await Bun.file(faviconDest).size) / 1024).toFixed(1)} KB`
)

const maplibreCssSrc = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl.css")
const maplibreCssDest = path.join(outdir, "maplibre-gl.css")
await Bun.write(maplibreCssDest, Bun.file(maplibreCssSrc))
console.log(
  ` ${path.relative(process.cwd(), maplibreCssDest)}  ${((await Bun.file(maplibreCssDest).size) / 1024).toFixed(1)} KB`
)

const applyCssSrc = path.join(process.cwd(), "public", "apply-css.js")
const applyCssDest = path.join(outdir, "apply-css.js")
await Bun.write(applyCssDest, Bun.file(applyCssSrc))
console.log(` ${path.relative(process.cwd(), applyCssDest)}`)

const robotsSrc = path.join(process.cwd(), "public", "robots.txt")
const robotsDest = path.join(outdir, "robots.txt")
await Bun.write(robotsDest, Bun.file(robotsSrc))
console.log(` ${path.relative(process.cwd(), robotsDest)}`)

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org https://*.openfreemap.org https://static.oshimaland.co.jp https://www.oshimaland.com https://www.oshimaland.co.jp; font-src 'self' data: https://tiles.openfreemap.org https://*.openfreemap.org; connect-src 'self' https://tiles.openfreemap.org https://*.openfreemap.org; worker-src 'self' blob:; child-src 'self' blob:"

const preloadCss = cssFiles
  .map((file) => `    <link rel="preload" href="./${file}" as="style" crossorigin />`)
  .join("\n")
const modulePreloads = [entryJsFile, ...staticJsDeps]
  .map((file) => `    <link rel="modulepreload" href="./${file}" crossorigin />`)
  .join("\n")
const stylesheetLinks = cssFiles
  .map(
    (file) =>
      `    <link rel="stylesheet" href="./${file}" media="print" data-app-css crossorigin />`
  )
  .join("\n")
const noscriptCss = cssFiles
  .map((file) => `      <link rel="stylesheet" href="./${file}" crossorigin />`)
  .join("\n")

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${PAGE_TITLE}</title>
    <meta name="description" content="${PAGE_DESCRIPTION}" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" sizes="any" />
    <link rel="apple-touch-icon" href="./favicon.svg" />
    <link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin />
    <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
    <style>
      :root {
        color-scheme: dark;
        --ink: #f2efe8;
        --paper: #0b0d10;
      }
      html,
      body,
      #root {
        height: 100%;
        margin: 0;
        background: var(--paper);
        color: var(--ink);
      }
    </style>
${preloadCss}
${modulePreloads}
${stylesheetLinks}
    <script src="./apply-css.js" defer></script>
    <noscript>
${noscriptCss}
    </noscript>
    <script type="module" crossorigin src="./${entryJsFile}"></script>
  </head>
  <body id="root"></body>
</html>
`

const indexHtml = path.join(outdir, "index.html")
const entryHtml = path.join(outdir, "entrypoint.html")
await Bun.write(indexHtml, html)
await Bun.write(entryHtml, html)
console.log(` ${path.relative(process.cwd(), indexHtml)}  (SPA index)`)
console.log(` ${path.relative(process.cwd(), entryHtml)}`)

const securityHeadersSrc = path.join(process.cwd(), "public", "_headers")
const securityHeaders = (await Bun.file(securityHeadersSrc).text()).trimEnd()

const linkHeaders = [
  ...cssFiles.map((file) => `  Link: </${file}>; rel=preload; as=style; crossorigin`),
  ...[entryJsFile, ...staticJsDeps].map(
    (file) => `  Link: </${file}>; rel=modulepreload; crossorigin`
  ),
  `  Link: </favicon.svg>; rel=preload; as=image; type=image/svg+xml`,
  `  Link: <https://tiles.openfreemap.org>; rel=preconnect; crossorigin`
].join("\n")

const earlyHintsBlock = `
# Link headers feed Cloudflare Early Hints (103) when enabled on the zone.
/
${linkHeaders}

/index.html
${linkHeaders}

/entrypoint.html
${linkHeaders}
`.trimEnd()

const hashedAssetCache = `
# Fingerprinted bundles — long cache; HTML stays revalidated by Workers Assets defaults.
/chunk-*
  Cache-Control: public, max-age=31536000, immutable

/entrypoint-*
  Cache-Control: public, max-age=31536000, immutable

/maplibre-gl.css
  Cache-Control: public, max-age=604800
`.trimEnd()

const headersDest = path.join(outdir, "_headers")
await Bun.write(headersDest, `${securityHeaders}\n\n${earlyHintsBlock}\n\n${hashedAssetCache}\n`)
console.log(` ${path.relative(process.cwd(), headersDest)}  (security + Early Hints Link)`)
