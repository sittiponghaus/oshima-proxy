import { bootstrapCsrf } from "@/app/usecase/csrf.usecase"
import { RegistryProvider } from "@effect/atom-react"
import { Effect } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "../container/app.container"

import "../globals.css"

void Effect.runPromise(bootstrapCsrf()).catch(() => {
  // API calls will retry bootstrap; avoid blocking first paint.
})

const elem = document.getElementById("root")!
;(import.meta.hot.data.root ??= createRoot(elem)).render(
  <StrictMode>
    <RegistryProvider>
      <App />
    </RegistryProvider>
  </StrictMode>
)
