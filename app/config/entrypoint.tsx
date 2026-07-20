import { ensureCsrfQueryData } from "@/app/query/domain.query"
import { queryClient } from "@/app/query/query-client"
import { RegistryProvider } from "@effect/atom-react"
import { QueryClientProvider } from "@tanstack/react-query"
import { NuqsAdapter } from "nuqs/adapters/react"
import { StrictMode, Suspense, lazy } from "react"
import { createRoot, type Root } from "react-dom/client"

import "@/app/globals.css"

/** MapLibre + app chrome — separate async chunk (Bun `splitting`). */
const App = lazy(() =>
  import("../container/app.container").then((module) => ({ default: module.App }))
)

void ensureCsrfQueryData().catch(() => {
  // API calls will retry bootstrap; avoid blocking first paint.
})

const elem = document.getElementById("root")!
const hotData = import.meta.hot?.data as { root?: Root } | undefined
const root = hotData?.root ?? createRoot(elem)
if (hotData) hotData.root = root

root.render(
  <StrictMode>
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <RegistryProvider>
          <Suspense fallback={null}>
            <App />
          </Suspense>
        </RegistryProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  </StrictMode>
)
