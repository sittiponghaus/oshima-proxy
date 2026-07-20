import { ensureCsrfQueryData } from "@/app/query/domain.query"
import { queryClient } from "@/app/query/query-client"
import { RegistryProvider } from "@effect/atom-react"
import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "../container/app.container"

import "@/app/globals.css"

void ensureCsrfQueryData().catch(() => {
  // API calls will retry bootstrap; avoid blocking first paint.
})

const elem = document.getElementById("root")!
;(import.meta.hot.data.root ??= createRoot(elem)).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RegistryProvider>
        <App />
      </RegistryProvider>
    </QueryClientProvider>
  </StrictMode>
)
