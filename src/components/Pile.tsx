import Card, { type CardData } from './Card'
import './Pile.css'

export type PileDirection = 'up' | 'down' | 'left' | 'right'

export interface PileAppearance {
  offset: number
  direction: PileDirection
  maxVisible: number
}

export interface PileProps {
  cards: CardData[]
  appearance?: Partial<PileAppearance>
}

const defaultAppearance: PileAppearance = {
  offset: 10,
  direction: 'up',
  maxVisible: 5,
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

export function Pile({ cards, appearance }: PileProps) {
  const { offset, direction, maxVisible } = { ...defaultAppearance, ...appearance }
  const visibleCards = cards.slice(0, maxVisible)
  const extraCards = cards.length - visibleCards.length

  return (
    <div className={`pile pile--${direction}`} aria-label={`Pile with ${cards.length} cards`}>
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

      {extraCards > 0 ? <div className="pile__overflow">+{extraCards}</div> : null}
    </div>
  )
}