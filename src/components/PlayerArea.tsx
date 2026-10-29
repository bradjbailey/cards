import type { Dispatch } from 'react'
import { Pile } from './Pile'
import { Hand } from './Hand'
import { MAX_DAMAGE, type GameAction, type GameState } from '../game/state'
import './PlayerArea.css'

interface PlayerAreaProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function PlayerArea({ state, dispatch }: PlayerAreaProps) {
  const { powerDeck, hand, damagePile, clearPile, selectedHandIndex } = state
  const damageRatio = damagePile.length / MAX_DAMAGE
  const damageClass =
    damageRatio >= 6 / MAX_DAMAGE
      ? 'player-area__damage--critical'
      : damageRatio >= 4 / MAX_DAMAGE
      ? 'player-area__damage--warning'
      : ''

  return (
    <div className="player-area">
      <div className="player-area__section">
        <div className="player-area__label">Power Deck</div>
        <Pile cards={powerDeck} appearance={{ offset: 2, direction: 'up', maxVisible: 4, showCounter: true }} />
      </div>

      <div className="player-area__section player-area__hand">
        <div className="player-area__label">Hand</div>
        <Hand
          cards={hand}
          center={{ x: 0, y: 0 }}
          offset={110}
          selectedHandIndex={selectedHandIndex}
          dispatch={dispatch}
        />
      </div>

      <div className={`player-area__section ${damageClass}`}>
        <div className="player-area__label">
          Damage ({damagePile.length}/{MAX_DAMAGE})
        </div>
        <Pile
          cards={damagePile}
          appearance={{ offset: 18, direction: 'right', maxVisible: MAX_DAMAGE }}
        />
      </div>

      <div className="player-area__section">
        <div className="player-area__label">Cleared ({clearPile.length})</div>
      </div>
    </div>
  )
}
