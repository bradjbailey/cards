import type { CardData } from './Card'
import { Pile } from './Pile'
import { Hand } from './Hand'
import './PlayerArea.css'

interface PlayerAreaProps {
  powerDeck: CardData[]
  hand: CardData[]
  damagePile: CardData[]
}

export function PlayerArea({ powerDeck, hand, damagePile }: PlayerAreaProps) {
  return (
    <div className="player-area">
      <div className="player-area__section">
        <div className="player-area__label">Power Deck</div>
        <Pile cards={powerDeck} appearance={{ offset: 2, direction: 'up', maxVisible: 4, showCounter: true }} />
      </div>

      <div className="player-area__section player-area__hand">
        <div className="player-area__label">Hand</div>
        <Hand cards={hand} center={{ x: 0, y: 0 }} offset={110} focus={true} />
      </div>

      <div className="player-area__section">
        <div className="player-area__label">
          Damage Bar ({damagePile.length}/7)
        </div>
        <Pile
          cards={damagePile}
          appearance={{ offset: 18, direction: 'right', maxVisible: 7 }}
        />
      </div>
    </div>
  )
}
