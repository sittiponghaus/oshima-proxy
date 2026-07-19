import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RegistryProvider } from "@effect/atom-react"

import { App } from "../presentation/app"

import "../presentation/globals.css"

const elem = document.getElementById("root")!
;(import.meta.hot.data.root ??= createRoot(elem)).render(
  <StrictMode>
    <RegistryProvider>
      <App />
    </RegistryProvider>
  </StrictMode>,
)
