import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import "./index.css"
import App from "./App.jsx"
import Core from "./components/Core.jsx"
import { DarkModeProvider } from "./components/DarkModeContext.jsx"

// Page transition variants for iOS-like animation
const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 300 : -300, // if going forward → slide from right, else from left
    opacity: 1, // keep both pages visible
    position: "absolute", // prevent layout shift
    width: "100%",
  }),
  animate: {
    x: 0,
    opacity: 1,
    position: "absolute",
    width: "100%",
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300, // slide App.jsx left, Core.jsx comes from right
    opacity: 1,
    position: "absolute",
    width: "100%",
  }),
}

const transition = {
  duration: 0.35,
  ease: "easeInOut",
}

function AnimatedRoutes() {
  const location = useLocation()
  const isGoingForward = location.pathname === "/core" ? 1 : -1

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={isGoingForward}>
        <Routes location={location} key={location.pathname}>
          {/* App.jsx */}
          <Route
            path="/"
            element={
              <motion.div
                custom={isGoingForward}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
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
                custom={isGoingForward}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
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
