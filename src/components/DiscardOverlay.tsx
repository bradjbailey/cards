import { useState } from 'react'
import Card, { type CardData } from './Card'
import { sortCards, type SortKey } from './Pile'
import './DiscardOverlay.css'

interface DiscardOverlayProps {
  cards: CardData[]
  onBack: () => void
  title: string
  sortable?: boolean
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'none', label: 'Order' },
  { key: 'suit', label: 'Suit' },
  { key: 'rank', label: 'Rank' },
]

const SUIT_LABELS  = ['♣ Clubs', '♦ Diamonds', '♥ Hearts', '♠ Spades']
const SUIT_CLASSES = ['clubs', 'diamonds', 'hearts', 'spades']
const RANK_LABELS  = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King']

interface Group { label: string; labelClass: string; cards: CardData[] }

function groupCards(cards: CardData[], key: SortKey): Group[] {
  if (key === 'suit') {
    return [0, 1, 2, 3]
      .map(suit => ({
        label: SUIT_LABELS[suit],
        labelClass: SUIT_CLASSES[suit],
        cards: sortCards(cards.filter(c => c.front.suit === suit), 'rank'),
      }))
      .filter(g => g.cards.length > 0)
  }
  if (key === 'rank') {
    return Array.from({ length: 13 }, (_, i) => i + 1)
      .map(rank => ({
        label: RANK_LABELS[rank],
        labelClass: '',
        cards: sortCards(cards.filter(c => c.front.rank === rank), 'suit'),
      }))
      .filter(g => g.cards.length > 0)
  }
  return []
}

export function DiscardOverlay({ cards, onBack, title, sortable }: DiscardOverlayProps) {
  const [sortKey, setSortKey] = useState<SortKey>('none')

  const groups = sortable && sortKey !== 'none' ? groupCards(cards, sortKey) : null
  const flatCards = !groups ? (sortable ? sortCards(cards, sortKey) : cards) : []

  return (
    <div className="discard-overlay">
      <div className="discard-overlay__header">
        <button className="discard-overlay__back" onClick={onBack}>← Back</button>
        <h2 className="discard-overlay__title">{title} ({cards.length})</h2>
        {sortable && (
          <div className="discard-overlay__sort-controls">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`discard-overlay__sort-btn${sortKey === opt.key ? ' discard-overlay__sort-btn--active' : ''}`}
                onClick={() => setSortKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="discard-overlay__empty">Nothing here yet.</p>
      ) : groups ? (
        <div className="discard-overlay__groups">
          {groups.map(group => (
            <div key={group.label} className="discard-overlay__group">
              <div className={`discard-overlay__group-header discard-overlay__group-header--${group.labelClass}`}>
                {group.label}
                <span className="discard-overlay__group-count">{group.cards.length}</span>
              </div>
              <div className="discard-overlay__group-cards">
                {group.cards.map((card, i) => (
                  <div key={i} className="discard-overlay__card">
                    <Card {...card} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="discard-overlay__grid">
          {flatCards.map((card, index) => (
            <div key={index} className="discard-overlay__card">
              <Card {...card} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
