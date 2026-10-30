import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyColors, DEFAULT_SETTINGS } from './hooks/useAppSettings'

// Apply saved colors before first render to avoid flash
try {
  const raw = localStorage.getItem('ctd_app_settings')
  if (raw) {
    const parsed = JSON.parse(raw)
    applyColors({ ...DEFAULT_SETTINGS.colors, ...parsed.colors })
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
