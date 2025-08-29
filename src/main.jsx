import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import "./index.css"
import App from "./App.jsx"
import Core from "./components/Core.jsx"
import { DarkModeProvider } from "./components/DarkModeContext.jsx"

const transition = { duration: 0.35, ease: "easeInOut" }

function AnimatedRoutes() {
  const location = useLocation()

  return (
    // Make a stacking context so absolute pages overlap correctly
    <div className="relative min-h-screen w-full overflow-hidden">
      <AnimatePresence mode="sync" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* App.jsx (first page shows immediately, no fade, no offscreen start) */}
          <Route
            path="/"
            element={
              <motion.div
                className="absolute inset-0"     // fill the viewport
                style={{ willChange: "transform" }}
                initial={{ x: 0, opacity: 1 }}   // don't start offscreen
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 1 }}   // slide out to the left
                transition={transition}
              >
                <App />
              </motion.div>
            }
          />

          {/* Core.jsx (slides in from the right immediately) */}
          <Route
            path="/core"
            element={
              <motion.div
                className="absolute inset-0"
                style={{ willChange: "transform" }}
                initial={{ x: 300, opacity: 1 }} // start just offscreen to the right
                animate={{ x: 0, opacity: 1 }}   // slide into place
                exit={{ x: 300, opacity: 1 }}    // when leaving, slide back right
                transition={transition}
              >
                <Core />
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DarkModeProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </DarkModeProvider>
  </StrictMode>
)
