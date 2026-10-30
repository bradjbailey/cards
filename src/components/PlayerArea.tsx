import { useState } from 'react'
import type { Dispatch } from 'react'
import { Pile } from './Pile'
import { Hand } from './Hand'
import Card from './Card'
import { DiscardOverlay } from './DiscardOverlay'
import { MAX_DAMAGE, type GameAction, type GameState } from '../game/state'
import './PlayerArea.css'

interface PlayerAreaProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function PlayerArea({ state, dispatch }: PlayerAreaProps) {
  const [showDiscard, setShowDiscard] = useState(false)
  const [showCleared, setShowCleared] = useState(false)
  const { powerDeck, hand, reserve, damagePile, clearPile, selectedHandIndex, selectedReserveIndex, inventory, pendingKingAbility } = state

  const pendingSuit = pendingKingAbility?.front.suit ?? null
  const handClickHandler = pendingSuit === 2
    ? (index: number) => dispatch({ type: 'USE_KING_HEARTS', handIndex: index })
    : undefined
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
          selectedHandIndex={handClickHandler ? null : selectedHandIndex}
          dispatch={handClickHandler ? undefined : dispatch}
          onCardClick={handClickHandler}
        />
      </div>

      <div
        className={`player-area__section player-area__damage-section ${damageClass}`}
        onClick={() => setShowDiscard(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowDiscard(true)}
        title="Click to view discard pile"
      >
        <div className="player-area__label">
          Damage ({damagePile.length}/{MAX_DAMAGE})
        </div>
        <Pile
          cards={damagePile}
          appearance={{ offset: 4, direction: 'up', maxVisible: 5, showCounter: true }}
        />
      </div>

      {showDiscard && (
        <DiscardOverlay title="Discard Pile" cards={damagePile} onBack={() => setShowDiscard(false)} />
      )}

      <div
        className="player-area__section player-area__damage-section"
        onClick={() => setShowCleared(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowCleared(true)}
        title="Click to view cleared pile"
      >
        <div className="player-area__label">Cleared ({clearPile.length})</div>
        <Pile
          cards={clearPile.map(c => ({ ...c, faceUp: false }))}
          appearance={{ offset: 2, direction: 'up', maxVisible: 4, showCounter: true }}
          sortable
        />
      </div>

      {showCleared && (
        <DiscardOverlay title="Cleared Pile" cards={clearPile} onBack={() => setShowCleared(false)} sortable />
      )}

      {reserve.length > 0 && (
        <div className="player-area__section">
          <div className="player-area__label">Reserve</div>
          <div className="player-area__reserve">
            {reserve.map((card, index) => (
              <Card
                key={index}
                {...card}
                selected={index === selectedReserveIndex}
                onClick={() => dispatch({ type: 'SELECT_RESERVE', index })}
              />
            ))}
          </div>
        </div>
      )}

      {inventory.length > 0 && (
        <div className="player-area__section">
          <div className="player-area__label">King Powers</div>
          <div className="player-area__reserve">
            {inventory.map((king, index) => (
              <Card
                key={index}
                {...king}
                selected={pendingKingAbility === king}
                onClick={() => dispatch({ type: 'ACTIVATE_KING', kingCard: king })}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
