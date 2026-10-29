import Card, { type CardData } from './Card'

interface handProps {
  cards: CardData[]
  center: { x: number; y: number }
  offset: number
  focus: boolean
}

export function Hand({ cards, center, offset, focus }: handProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '220px' }}>
      {cards.map((card, index) => {
        const style = {
          position: 'absolute' as const,
          left: `calc(50% + ${center.x + index * offset}px)`,
          top: `calc(50% + ${center.y}px)`,
          transform: 'translate(-50%, -50%)',
          opacity: focus ? 1 : 0.95,
          filter: focus ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.6))' : undefined,
        }

        return (
          <div key={`${card.front.rank}-${card.front.suit}-${index}`} style={style}>
            <Card {...card} />
          </div>
        )
      })}
    </div>
  )
}