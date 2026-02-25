import React from "react"
import { createRoot } from "react-dom/client"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { App } from "./App"
import "./index.css"

const container = document.getElementById("root")

if (!container) {
  throw new Error("Root element not found")
}

createRoot(container).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  </React.StrictMode>,
)
