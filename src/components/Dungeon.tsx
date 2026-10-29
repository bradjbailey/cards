import type { Dispatch } from 'react'
import { DungeonColumn } from './DungeonColumn'
import type { GameAction, GameState } from '../game/state'
import './Dungeon.css'

interface DungeonProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function Dungeon({ state, dispatch }: DungeonProps) {
  return (
    <div className="dungeon">
      {state.dungeonColumns.map((_, i) => (
        <DungeonColumn key={i} columnIndex={i} state={state} dispatch={dispatch} />
      ))}
    </div>
  )
}
