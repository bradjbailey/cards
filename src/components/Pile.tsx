import { useState } from 'react'
import Card, { type CardData } from './Card'
import './Pile.css'

export type PileDirection = 'up' | 'down' | 'left' | 'right'
export type SortKey = 'none' | 'suit' | 'rank'

export interface PileAppearance {
  offset: number
  direction: PileDirection
  maxVisible: number
  showCounter: boolean
}

export interface PileProps {
  cards: CardData[]
  appearance?: Partial<PileAppearance>
  sortable?: boolean
}

export function sortCards(cards: CardData[], key: SortKey): CardData[] {
  if (key === 'none') return cards
  return [...cards].sort((a, b) => {
    if (key === 'suit') {
      return a.front.suit !== b.front.suit
        ? a.front.suit - b.front.suit
        : a.front.rank - b.front.rank
    }
    return a.front.rank !== b.front.rank
      ? a.front.rank - b.front.rank
      : a.front.suit - b.front.suit
  })
}

const defaultAppearance: PileAppearance = {
  offset: 10,
  direction: 'up',
  maxVisible: 5,
  showCounter: false,
}

export function createPileTestCards(count: number): CardData[] {
  return Array.from({ length: count }, (_, index) => ({
    faceUp: index % 2 === 0,
    front: {
      rank: (index % 13) + 1,
      suit: index % 4,
    },
    back: {
      color: 'Blue' as const,
      version: 1 as const,
    },
  }))
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'none', label: '—' },
  { key: 'suit', label: 'Suit' },
  { key: 'rank', label: 'Rank' },
]

export function Pile({ cards, appearance, sortable }: PileProps) {
  const [sortKey, setSortKey] = useState<SortKey>('none')
  const { offset, direction, maxVisible, showCounter } = { ...defaultAppearance, ...appearance }
  const sorted = sortable ? sortCards(cards, sortKey) : cards
  const visibleCards = sorted.slice(0, maxVisible)
  const n = visibleCards.length
  const slots = Math.max(1, n)

  const isHorizontal = direction === 'left' || direction === 'right'
  const sizeStyle = isHorizontal
    ? {
        width: `calc(var(--card-width) + ${(slots - 1) * offset}px + 16px)`,
        height: `calc(var(--card-height) + 16px)`,
      }
    : {
        height: `calc(var(--card-height) + ${(slots - 1) * offset}px + 16px)`,
        width: `calc(var(--card-width) + 16px)`,
      }

  return (
    <>
      <div className={`pile pile--${direction}`} style={sizeStyle} aria-label={`Pile with ${cards.length} cards`}>
        {n === 0 && <div className="pile__empty" />}
        {visibleCards.map((card, index) => {
          const offsetStyle = direction === 'left' || direction === 'right'
            ? { transform: `translateX(${index * offset}px)` }
            : { transform: `translateY(${index * offset}px)` }

          return (
            <div className="pile__card" key={`${card.front.rank}-${card.front.suit}-${index}`} style={offsetStyle}>
              <Card {...card} />
            </div>
          )
        })}

        {showCounter && cards.length > 0 ? <div className="pile__counter">{cards.length}</div> : null}
      </div>
      {sortable && (
        <div className="pile__sort-controls">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`pile__sort-btn${sortKey === opt.key ? ' pile__sort-btn--active' : ''}`}
              onClick={e => { e.stopPropagation(); setSortKey(opt.key) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}