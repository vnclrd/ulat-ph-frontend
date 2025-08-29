import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./index.css"
import App from "./App.jsx"
import Core from './components/Core.jsx'
import { DarkModeProvider } from './components/DarkModeContext.jsx'

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/core" element={<Core />} />
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  </StrictMode>
);