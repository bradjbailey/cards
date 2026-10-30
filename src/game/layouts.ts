export type LayoutKey = 'standard' | 'tall' | 'pyramid' | 'hourglass' | 'spires'

/** Explicit coverage override: card at (coverRow, coverCol) covers these cols in row coverRow-1. */
export interface ExtraCover {
  coverRow: number
  coverCol: number
  coversInRowAbove: number[]
}

export interface LayoutDef {
  key: LayoutKey
  name: string
  /** Row widths from top (deepest) to bottom (front), must sum to 12. */
  rows: number[]
  /**
   * Non-geometric coverage overrides. Use when a card should logically block
   * cards in the row above even though it doesn't physically overlap them.
   */
  extraCovers?: ExtraCover[]
}

export const LAYOUTS: LayoutDef[] = [
  { key: 'standard',  name: 'Standard',    rows: [4, 4, 4]          },
  { key: 'tall',      name: 'Tall',        rows: [3, 3, 3, 3]       },
  { key: 'pyramid',   name: 'Pyramid',     rows: [2, 3, 3, 4]       },
  { key: 'hourglass', name: 'Hourglass',   rows: [2, 2, 3, 2, 3]    },
  {
    key: 'spires',
    name: 'Twin Spires',
    rows: [1, 2, 3, 1, 2, 3],
    // The single card at row 3 sits below the 3-card row at row 2. Geometrically
    // it only overlaps the center card, but in play it blocks all three.
    extraCovers: [{ coverRow: 3, coverCol: 0, coversInRowAbove: [0, 2] }],
  },
]

export const DEFAULT_LAYOUT: LayoutKey = 'standard'

export function getLayout(key: LayoutKey): LayoutDef {
  return LAYOUTS.find(l => l.key === key)!
}
