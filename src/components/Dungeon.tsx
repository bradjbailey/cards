import type { Dispatch } from 'react'
import { DungeonCell } from './DungeonCell'
import type { GameAction, GameState } from '../game/state'
import './Dungeon.css'

interface DungeonProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function Dungeon({ state, dispatch }: DungeonProps) {
  return (
    <div className="dungeon">
      {state.dungeonGrid.map((row, r) => (
        <div key={r} className="dungeon-row">
          {row.map((_cell, c) => (
            <DungeonCell key={c} row={r} col={c} state={state} dispatch={dispatch} />
          ))}
        </div>
      ))}
    </div>
  )
}
