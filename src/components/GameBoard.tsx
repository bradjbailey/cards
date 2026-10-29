import { useReducer } from 'react'
import { gameReducer, initialState } from '../game/state'
import { Dungeon } from './Dungeon'
import { PlayerArea } from './PlayerArea'
import './GameBoard.css'

export function GameBoard() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  if (state.phase === 'idle') {
    return (
      <div className="game-board game-board--idle">
        <h1>Clear the Dungeon</h1>
        <button className="game-board__start" onClick={() => dispatch({ type: 'NEW_GAME' })}>
          Start Game
        </button>
      </div>
    )
  }

  return (
    <div className="game-board">
      <section className="game-board__dungeon">
        <h2>Dungeon</h2>
        <Dungeon columns={state.dungeonColumns} />
      </section>

      <section className="game-board__player">
        <h2>Player</h2>
        <PlayerArea
          powerDeck={state.powerDeck}
          hand={state.hand}
          damagePile={state.damagePile}
        />
      </section>
    </div>
  )
}
