/* Promote print-media stylesheets after they're downloaded (CSP-safe; no inline handlers). */
for (const link of document.querySelectorAll("link[data-app-css]")) {
  const promote = () => {
    link.media = "all"
  }
  // Already loaded (cached) → promote immediately; otherwise wait for load.
  if (link.sheet) {
    promote()
  } else {
    link.addEventListener("load", promote, { once: true })
  }
}
