import type { Dispatch } from 'react'
import Card from './Card'
import {
  activeMonster,
  monsterLevel,
  monsterName,
  placementError,
  powerSum,
  suitName,
  POWER_SLOTS,
  type GameAction,
  type GameState,
} from '../game/state'

interface DungeonColumnProps {
  columnIndex: number
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function DungeonColumn({ columnIndex, state, dispatch }: DungeonColumnProps) {
  const cards = state.dungeonColumns[columnIndex]
  const attack = state.attacks[columnIndex]
  const locked = state.lockedCount[columnIndex]
  const monster = activeMonster(cards)

  const selectedCard =
    state.selectedHandIndex !== null ? state.hand[state.selectedHandIndex] : null

  const isLegal = selectedCard
    ? placementError(state, selectedCard, columnIndex) === null
    : null

  if (cards.length === 0) {
    return (
      <div className="dungeon-column dungeon-column--cleared">
        <div className="dungeon-column__cleared-label">Cleared</div>
      </div>
    )
  }

  return (
    <div className="dungeon-column">
      {/* Stacked card pile — clicking places the selected card */}
      <div className="dungeon-column__stack">
        {cards.map((card, idx) => {
          const isTopCard = idx === cards.length - 1
          return (
            <div
              key={idx}
              className={`dungeon-column__card-slot${idx > 0 ? ' dungeon-column__card-slot--stacked' : ''}`}
            >
              <Card
                {...card}
                onClick={isTopCard ? () => dispatch({ type: 'PLACE_CARD', columnIndex }) : undefined}
                highlight={isTopCard && isLegal === true ? true : undefined}
                dimmed={isTopCard && isLegal === false ? true : undefined}
              />
            </div>
          )
        })}
      </div>

      {/* Monster info */}
      {monster && (
        <div className="dungeon-column__badge">
          <div className="dungeon-column__badge-name">{monsterName(monster)}</div>
          <div className="dungeon-column__badge-detail">
            Level {monsterLevel(monster)} · needs {suitName(monster.front.suit)}
          </div>
        </div>
      )}

      {/* Attack cards */}
      {monster && (
        <div className="dungeon-column__attacks">
          {attack.map((card, slotIndex) => (
            <div key={slotIndex} className={`dungeon-column__attack-card${slotIndex < locked ? ' dungeon-column__attack-card--locked' : ''}`}>
              <Card
                {...card}
                onClick={() => dispatch({ type: 'RECALL_CARD', columnIndex, slotIndex })}
              />
            </div>
          ))}

          {attack.length > 0 && (
            <div className="dungeon-column__power-info">
              {attack.length < POWER_SLOTS
                ? `Need ${POWER_SLOTS - attack.length} more power`
                : `${suitName(monster.front.suit)} trigger (${powerSum(attack, state.settings)}/${monsterLevel(monster)})`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
