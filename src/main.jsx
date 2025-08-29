import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import "./index.css"
import App from "./App.jsx"
import Core from './components/Core.jsx'
import { DarkModeProvider } from './components/DarkModeContext.jsx'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* App.jsx */}
        <Route
          path="/"
          element={
            <motion.div
              initial={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <App />
            </motion.div>
          }
        />

        {/* Core.jsx */}
        <Route
          path="/core"
          element={
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <Core />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
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
