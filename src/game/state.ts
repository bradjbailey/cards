import type { CardData } from '../components/Card'
import { createFullDeck, shuffle, separateDecks } from './deck'

export type GamePhase = 'idle' | 'draw' | 'attack' | 'discard' | 'won' | 'lost'

export interface GameState {
  phase: GamePhase
  dungeonColumns: CardData[][]
  powerDeck: CardData[]
  hand: CardData[]
  damagePile: CardData[]
  clearPile: CardData[]
}

export const initialState: GameState = {
  phase: 'idle',
  dungeonColumns: [[], [], [], []],
  powerDeck: [],
  hand: [],
  damagePile: [],
  clearPile: [],
}

export type GameAction = { type: 'SETUP' } | { type: 'DRAW' }

function dealDungeon(monsters: CardData[]): CardData[][] {
  // 4 columns × 3 cards; index 0 = bottom (face down), index 2 = top (face up)
  const columns: CardData[][] = [[], [], [], []]
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) {
      columns[col].push({ ...monsters[col * 3 + row], faceUp: false })
    }
    const last = columns[col].length - 1
    columns[col][last] = { ...columns[col][last], faceUp: true }
  }
  return columns
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SETUP': {
      const { monsters, power } = separateDecks(createFullDeck())
      const shuffledMonsters = shuffle(monsters)
      const shuffledPower = shuffle(power)
      const dungeonColumns = dealDungeon(shuffledMonsters)
      const hand = shuffledPower.slice(0, 3).map(c => ({ ...c, faceUp: true }))
      const powerDeck = shuffledPower.slice(3)
      return {
        phase: 'attack',
        dungeonColumns,
        powerDeck,
        hand,
        damagePile: [],
        clearPile: [],
      }
    }
    case 'DRAW': {
      if (state.phase !== 'draw') return state
      const drawn = state.powerDeck.slice(0, 3).map(c => ({ ...c, faceUp: true }))
      return {
        ...state,
        phase: 'attack',
        hand: drawn,
        powerDeck: state.powerDeck.slice(3),
      }
    }
    default:
      return state
  }
}
