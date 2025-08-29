import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import "./index.css"
import App from "./App.jsx"
import Core from "./components/Core.jsx"
import { DarkModeProvider } from "./components/DarkModeContext.jsx"

// Page transition variants
const pageVariants = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
}

const transition = {
  duration: 0.35, // slightly faster
  ease: "easeInOut",
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        {/* App.jsx */}
        <Route
          path="/"
          element={
            <motion.div
              variants={pageVariants}
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={transition}
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
              variants={pageVariants}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={transition}
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
