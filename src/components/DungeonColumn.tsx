import type { CardData } from './Card'
import { Pile } from './Pile'

interface DungeonColumnProps {
  cards: CardData[]
}

export function DungeonColumn({ cards }: DungeonColumnProps) {
  return (
    <div className="dungeon-column">
      <Pile
        cards={cards}
        appearance={{ offset: 28, direction: 'down', maxVisible: cards.length }}
      />
    </div>
  )
}
