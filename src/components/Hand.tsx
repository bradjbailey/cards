import type { Dispatch } from 'react'
import Card, { type CardData } from './Card'
import type { GameAction } from '../game/state'

interface HandProps {
  cards: CardData[]
  center: { x: number; y: number }
  offset: number
  selectedHandIndex?: number | null
  dispatch?: Dispatch<GameAction>
  onCardClick?: (index: number) => void
  /** @deprecated no longer used */ focus?: boolean
}

export function Hand({ cards, center, offset, selectedHandIndex = null, dispatch, onCardClick }: HandProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '220px' }}>
      {cards.map((card, index) => {
        const isSelected = index === selectedHandIndex
        const style = {
          position: 'absolute' as const,
          left: `calc(50% + ${center.x + (index - (cards.length - 1) / 2) * offset}px)`,
          top: `calc(50% + ${center.y}px)`,
          transform: `translate(-50%, -50%)`,
          zIndex: isSelected ? 10 : index,
        }

        return (
          <div key={`${card.front.rank}-${card.front.suit}-${index}`} style={style}>
            <Card
              {...card}
              selected={isSelected}
              onClick={onCardClick
                ? () => onCardClick(index)
                : dispatch ? () => dispatch({ type: 'SELECT_HAND', index }) : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}
