import { useReducer, useState } from 'react'
import { gameReducer, initialState, hasInsufficientAttack } from '../game/state'
import { Dungeon } from './Dungeon'
import { PlayerArea } from './PlayerArea'
import { NewGameModal } from './NewGameModal'
import './GameBoard.css'

export function GameBoard() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [showModal, setShowModal] = useState(false)

  if (state.phase === 'idle') {
    return (
      <div className="game-board game-board--idle">
        <h1>Clear the Dungeon</h1>
        <button className="game-board__start" onClick={() => setShowModal(true)}>
          New Game
        </button>
        {showModal && (
          <NewGameModal
            onStart={(settings) => { dispatch({ type: 'NEW_GAME', settings }); setShowModal(false) }}
            onCancel={() => setShowModal(false)}
          />
        )}
      </div>
    )
  }

  const gameOver = state.phase === 'won' || state.phase === 'lost'
  const endTurnBlocked = !gameOver && hasInsufficientAttack(state)
  const pendingAbility = state.pendingKingAbility

  return (
    <div className="game-board">
      <Dungeon state={state} dispatch={dispatch} />
      <PlayerArea state={state} dispatch={dispatch} />
      <div className="game-board__controls">
        <button
          className="game-board__end-turn"
          onClick={() => dispatch({ type: 'END_TURN' })}
          disabled={gameOver || endTurnBlocked || !!pendingAbility}
        >
          End Turn (Discard &amp; Draw)
        </button>
        {pendingAbility && (
          <>
            <p className="game-board__message game-board__message--ability">
              {state.message}
            </p>
            <button
              className="game-board__cancel-ability"
              onClick={() => dispatch({ type: 'CANCEL_KING_ABILITY' })}
            >
              Cancel
            </button>
          </>
        )}
        {endTurnBlocked && !pendingAbility && (
          <p className="game-board__message game-board__message--blocked">
            Recall a power card — locking these would make that monster unbeatable.
          </p>
        )}
        {state.message && !gameOver && !endTurnBlocked && !pendingAbility && (
          <p className="game-board__message">{state.message}</p>
        )}
      </div>
      {gameOver && (
        <div className="game-board__overlay">
          <div className="game-board__overlay-box">
            <h2 className={state.phase === 'won' ? 'game-board__overlay-title--won' : 'game-board__overlay-title--lost'}>
              {state.phase === 'won' ? 'Victory!' : 'Defeated!'}
            </h2>
            {state.message && <p className="game-board__overlay-message">{state.message}</p>}
            {state.phase === 'won' && state.score !== null && (
              <p className="game-board__overlay-score">Score: {state.score}</p>
            )}
            <button
              className="game-board__start"
              onClick={() => dispatch({ type: 'BACK_TO_MENU' })}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
