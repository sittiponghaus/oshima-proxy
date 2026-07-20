/* Promote print-media stylesheets after they're downloaded (CSP-safe; no inline handlers). */
for (const link of document.querySelectorAll("link[data-app-css]")) {
  link.media = "all"
}
