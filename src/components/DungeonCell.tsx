import type { Dispatch, CSSProperties } from 'react'
import Card from './Card'
import {
  isCoveredBy,
  monsterLevel,
  placementError,
  powerSum,
  POWER_SLOTS,
  type GameAction,
  type GameState,
} from '../game/state'

const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠']

interface DungeonCellProps {
  row: number
  col: number
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function DungeonCell({ row, col, state, dispatch }: DungeonCellProps) {
  const cell = state.dungeonGrid[row]?.[col]
  const attack = state.attacks[row]?.[col] ?? []
  const locked = state.lockedCount[row]?.[col] ?? 0

  const selectedCard =
    state.selectedHandIndex !== null ? state.hand[state.selectedHandIndex] :
    state.selectedReserveIndex !== null ? state.reserve[state.selectedReserveIndex] : null

  const pendingSpades = state.pendingKingAbility?.front.suit === 3

  const isLegal = selectedCard && cell?.faceUp
    ? placementError(state, selectedCard, row, col) === null
    : null

  // Defeated cell: show placeholder to preserve grid spacing.
  if (cell === null) {
    return <div className="dungeon-cell dungeon-cell--cleared" />
  }

  // Face-down cell: covered by another card — show card back, no interaction.
  if (!cell.faceUp) {
    const depth = isCoveredBy(state.coverableBy, state.dungeonGrid, row, col) ? ' dungeon-cell--deep' : ''
    return (
      <div className={`dungeon-cell${depth}`}>
        <Card faceUp={false} front={cell.front} back={cell.back} />
      </div>
    )
  }

  // Attack card fan: rotate and spread cards visually over the monster.
  function attackCardStyle(i: number, total: number): CSSProperties {
    const center = (total - 1) / 2
    const offset = i - center
    const txPx = offset * 22
    const rotDeg = offset * 9
    return { transform: `translateX(${txPx}px) rotate(${rotDeg}deg)`, zIndex: i + 1 }
  }

  // Badge state for the attack progress overlay.
  const sum = attack.length > 0 ? powerSum(attack, state.settings) : 0
  const level = monsterLevel(cell)
  const suit = cell.front.suit
  const powerReady = attack.length >= POWER_SLOTS && sum >= level
  const powerBlocked = attack.length >= POWER_SLOTS && sum < level
  const badgeClass = [
    'dungeon-cell__attack-badge',
    powerReady ? 'dungeon-cell__attack-badge--ready' : '',
    powerBlocked ? 'dungeon-cell__attack-badge--warn' : '',
  ].filter(Boolean).join(' ')

  // Face-up (active) cell: show monster + overlapping attack cards.
  return (
    <div className="dungeon-cell">
      <Card
        {...cell}
        onClick={() => dispatch({ type: 'PLACE_CARD', row, col })}
        highlight={isLegal === true ? true : undefined}
        dimmed={isLegal === false ? true : undefined}
      />

      {attack.length > 0 && (
        <>
          <div className={badgeClass}>
            <span className={`dungeon-cell__suit-pip dungeon-cell__suit-pip--${suit}`}>
              {SUIT_SYMBOLS[suit]}
            </span>
            <span className="dungeon-cell__power-fraction">
              {sum}/{level}
            </span>
          </div>

          <div className="dungeon-cell__attacks">
            {attack.map((card, slotIndex) => (
              <div
                key={slotIndex}
                className={`dungeon-cell__attack-wrapper${slotIndex < locked ? ' dungeon-cell__attack-wrapper--locked' : ''}`}
                style={attackCardStyle(slotIndex, attack.length)}
              >
                <Card
                  {...card}
                  highlight={pendingSpades ? true : undefined}
                  onClick={pendingSpades
                    ? () => dispatch({ type: 'USE_KING_SPADES', row, col, slotIndex })
                    : () => dispatch({ type: 'RECALL_CARD', row, col, slotIndex })}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
