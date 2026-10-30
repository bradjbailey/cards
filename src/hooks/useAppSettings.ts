import { useState, useEffect } from 'react'
import type { BackOfCard } from '../components/Card'

export interface ColorSettings {
  bg: string
  primary: string
  secondary: string
}

export interface AppSettings {
  colors: ColorSettings
  cardBack: BackOfCard
}

export const DEFAULT_SETTINGS: AppSettings = {
  colors: {
    bg: '#0d0d14',
    primary: '#e8d87a',
    secondary: '#7070a0',
  },
  cardBack: { color: 'Blue', version: 1 },
}

const STORAGE_KEY = 'ctd_app_settings'

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) {        g = c; b = x }
  else if (h < 240) {        g = x; b = c }
  else if (h < 300) { r = x;        b = c }
  else              { r = c;        b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function applyColors(colors: ColorSettings) {
  const root = document.documentElement
  const [bgH, bgS, bgL] = hexToHSL(colors.bg)
  const [pH, pS, pL] = hexToHSL(colors.primary)

  root.style.setProperty('--color-bg', colors.bg)
  root.style.setProperty('--color-panel',   hslToHex(bgH, bgS, bgL + 2))
  root.style.setProperty('--color-surface', hslToHex(bgH, bgS, bgL + 4))
  root.style.setProperty('--color-border',  hslToHex(bgH, bgS, bgL + 13))
  root.style.setProperty('--color-primary', colors.primary)
  root.style.setProperty('--color-primary-border',   hslToHex(pH, pS, pL * 0.68))
  root.style.setProperty('--color-primary-bg',       hslToHex(pH, pS * 0.65, pL * 0.145))
  root.style.setProperty('--color-primary-bg-hover', hslToHex(pH, pS * 0.65, pL * 0.21))
  root.style.setProperty('--color-primary-hover',    hslToHex(pH, pS, Math.min(95, pL * 1.07)))
  root.style.setProperty('--color-secondary', colors.secondary)
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_SETTINGS, ...parsed, colors: { ...DEFAULT_SETTINGS.colors, ...parsed.colors } }
      }
    } catch {}
    return DEFAULT_SETTINGS
  })

  useEffect(() => { applyColors(settings.colors) }, [settings.colors])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  return {
    settings,
    updateColors: (patch: Partial<ColorSettings>) =>
      setSettings(s => ({ ...s, colors: { ...s.colors, ...patch } })),
    updateCardBack: (cardBack: BackOfCard) =>
      setSettings(s => ({ ...s, cardBack })),
    resetColors: () =>
      setSettings(s => ({ ...s, colors: DEFAULT_SETTINGS.colors })),
  }
}
