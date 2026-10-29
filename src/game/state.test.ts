import { describe, it, expect } from 'vitest'
import type { CardData } from '../components/Card'
import {
  gameReducer,
  initialState,
  defaultSettings,
  cardPower,
  isValidTrigger,
  powerSum,
  placementError,
  monsterName,
  HAND_SIZE,
  MAX_DAMAGE,
  type GameState,
  type GameSettings,
} from './state'

// --- Card factories ---------------------------------------------------------

function card(rank: number, suit: number, joker?: true): CardData {
  return {
    faceUp: true,
    front: joker ? { rank, suit, joker } : { rank, suit },
    back: { color: 'Blue', version: 1 },
  }
}

const power = (rank: number, suit = 0) => card(rank, suit)
const joker = (suit = 0) => card(0, suit, true)
const monster = (rank: number, suit: number) => card(rank, suit)

// Suits: 0 Clubs, 1 Diamonds, 2 Hearts, 3 Spades. Monsters: J 11, Q 12, K 13.

function playing(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialState,
    phase: 'playing',
    dungeonColumns: [[], [], [], []],
    attacks: [[], [], [], []],
    lockedCount: [0, 0, 0, 0],
    hand: [],
    powerDeck: [],
    ...overrides,
  }
}

// --- Pure helpers -----------------------------------------------------------

describe('card value helpers', () => {
  it('scores a joker as 10 and other cards as their rank', () => {
    expect(cardPower(joker())).toBe(10)
    expect(cardPower(power(1))).toBe(1) // Ace is low in the base game
    expect(cardPower(power(7))).toBe(7)
    expect(cardPower(power(10))).toBe(10)
  })

  it('validates triggers by suit, with jokers wild', () => {
    const kingHearts = monster(13, 2)
    expect(isValidTrigger(power(5, 2), kingHearts)).toBe(true) // heart
    expect(isValidTrigger(power(5, 0), kingHearts)).toBe(false) // club
    expect(isValidTrigger(joker(0), kingHearts)).toBe(true) // joker, any suit
  })

  it('sums only the first two (power) cards', () => {
    expect(powerSum([power(6), power(7)])).toBe(13)
    expect(powerSum([joker(), power(3)])).toBe(13)
    expect(powerSum([power(6)])).toBe(6)
  })
})

// --- NEW_GAME ---------------------------------------------------------------

describe('NEW_GAME', () => {
  const state = gameReducer(initialState, { type: 'NEW_GAME' })

  it('enters play with four columns of three monsters', () => {
    expect(state.phase).toBe('playing')
    expect(state.dungeonColumns).toHaveLength(4)
    for (const col of state.dungeonColumns) expect(col).toHaveLength(3)
    const monsters = state.dungeonColumns.flat()
    expect(monsters).toHaveLength(12)
    for (const m of monsters) {
      expect(m.front.rank).toBeGreaterThanOrEqual(11)
      expect(m.front.rank).toBeLessThanOrEqual(13)
      expect(m.front.joker).toBeUndefined()
    }
  })

  it('reveals only the top monster of each column', () => {
    for (const col of state.dungeonColumns) {
      expect(col[col.length - 1].faceUp).toBe(true)
      for (const m of col.slice(0, -1)) expect(m.faceUp).toBe(false)
    }
  })

  it('deals a hand of three and leaves the rest as the power deck', () => {
    expect(state.hand).toHaveLength(HAND_SIZE)
    expect(state.hand.every((c) => c.faceUp)).toBe(true)
    expect(state.powerDeck).toHaveLength(42 - HAND_SIZE)
    const powerCards = [...state.hand, ...state.powerDeck]
    for (const c of powerCards) {
      expect(c.front.joker === true || c.front.rank <= 10).toBe(true)
    }
  })

  it('starts with empty piles and no selection', () => {
    expect(state.damagePile).toHaveLength(0)
    expect(state.clearPile).toHaveLength(0)
    expect(state.selectedHandIndex).toBeNull()
    expect(state.score).toBeNull()
  })

  it('uses default settings and empty inventory when none supplied', () => {
    expect(state.settings).toEqual(defaultSettings)
    expect(state.inventory).toHaveLength(0)
  })

  it('stores custom settings passed at game start', () => {
    const custom: GameSettings = { boomersAce: true, powerReserve: false, kingAbilities: true }
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: custom })
    expect(s.settings).toEqual(custom)
  })
})

// --- Selection --------------------------------------------------------------

describe('SELECT_HAND', () => {
  const base = playing({ hand: [power(5), power(6), power(7)] })

  it('selects and toggles a hand card', () => {
    const selected = gameReducer(base, { type: 'SELECT_HAND', index: 1 })
    expect(selected.selectedHandIndex).toBe(1)
    const toggled = gameReducer(selected, { type: 'SELECT_HAND', index: 1 })
    expect(toggled.selectedHandIndex).toBeNull()
  })

  it('ignores out-of-range indices', () => {
    expect(gameReducer(base, { type: 'SELECT_HAND', index: 9 }).selectedHandIndex).toBeNull()
  })
})

// --- Placement: power slots -------------------------------------------------

describe('PLACE_CARD power slots', () => {
  it('requires a selected card', () => {
    const s = playing({ dungeonColumns: [[monster(11, 0)], [], [], []], hand: [power(5)] })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.message).toMatch(/select/i)
    expect(next.attacks[0]).toHaveLength(0)
  })

  it('rejects a column with no monster', () => {
    const s = playing({ hand: [power(5)], selectedHandIndex: 0 })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.message).toMatch(/no monster/i)
  })

  it('places the first two cards as power and consumes them from hand', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 2)], [], [], []],
      hand: [power(6, 0), power(7, 1)],
      selectedHandIndex: 0,
    })
    const first = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(first.attacks[0]).toHaveLength(1)
    expect(first.hand).toHaveLength(1)
    expect(first.selectedHandIndex).toBeNull()

    const withSecond = gameReducer(first, { type: 'SELECT_HAND', index: 0 })
    const second = gameReducer(withSecond, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(second.attacks[0]).toHaveLength(2)
    expect(second.hand).toHaveLength(0)
    expect(powerSum(second.attacks[0])).toBe(13)
  })
})

// --- Placement: trigger / defeat -------------------------------------------

describe('PLACE_CARD trigger', () => {
  it('rejects a trigger when the two power cards are too weak', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 2)], [], [], []], // King of Hearts, level 13
      attacks: [[power(4), power(5)], [], [], []], // sum 9 < 13
      hand: [power(2, 2)], // a heart, but power too low
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.message).toMatch(/needs 13/i)
    expect(next.dungeonColumns[0]).toHaveLength(1) // not defeated
  })

  it('rejects a trigger of the wrong suit', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 2)], [], [], []], // Jack of Hearts, level 11
      attacks: [[power(6), power(6)], [], [], []], // sum 12 >= 11
      hand: [power(9, 0)], // club, wrong suit
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.message).toMatch(/hearts/i)
    expect(next.dungeonColumns[0]).toHaveLength(1)
  })

  it('defeats a monster with a valid trigger and reveals the next', () => {
    const s = playing({
      dungeonColumns: [[monster(12, 3), monster(11, 2)], [], [], []],
      attacks: [[power(6), power(6)], [], [], []], // sum 12 >= 11 (Jack)
      hand: [power(3, 2)], // heart trigger — last card; auto-draw fires
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.dungeonColumns[0]).toHaveLength(1)
    expect(next.dungeonColumns[0][0].faceUp).toBe(true) // next monster revealed
    expect(next.attacks[0]).toHaveLength(0)
    expect(next.lockedCount[0]).toBe(0)
    expect(next.clearPile).toHaveLength(4) // 2 power + trigger + monster
    expect(next.hand).toHaveLength(HAND_SIZE) // auto-drew after emptying hand
    expect(next.phase).toBe('playing')
    expect(next.message).toMatch(/defeated/i)
  })

  it('accepts a joker as a wild trigger', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 3)], [], [], []], // King of Spades
      attacks: [[power(7), power(7)], [], [], []], // sum 14 >= 13
      hand: [joker(2)], // joker (image is a heart) still triggers spades
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.dungeonColumns[0]).toHaveLength(0)
    expect(next.clearPile).toHaveLength(4)
  })

  it('counts a joker power card as 10', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 1)], [], [], []], // King of Diamonds, level 13
      attacks: [[joker(0), power(3)], [], [], []], // 10 + 3 = 13
      hand: [power(5, 1)], // diamond trigger
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.dungeonColumns[0]).toHaveLength(0)
  })

  it('wins and scores when the last monster falls', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 2)], [], [], []],
      attacks: [[power(6), power(6)], [], [], []],
      hand: [power(4, 2)],
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)], // 3 cards left -> score 3
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.phase).toBe('won')
    expect(next.score).toBe(3)
    expect(next.message).toMatch(/cleared/i)
  })
})

  it('auto-draws after defeating a monster when the last hand card is used', () => {
    const s = playing({
      // Two columns still active so the defeat does not win the game
      dungeonColumns: [[monster(11, 2)], [monster(13, 0)], [], []],
      attacks: [[power(6), power(6)], [], [], []],
      hand: [power(4, 2)], // only card in hand; using it defeats the monster
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.phase).toBe('playing')
    expect(next.hand).toHaveLength(HAND_SIZE)
    expect(next.powerDeck).toHaveLength(0)
    expect(next.message).toMatch(/defeated/i)
  })

  it('loses when auto-draw finds an empty power deck with monsters remaining', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 2)], [monster(13, 0)], [], []],
      attacks: [[power(6), power(6)], [], [], []],
      hand: [power(4, 2)],
      selectedHandIndex: 0,
      powerDeck: [],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.phase).toBe('lost')
    expect(next.message).toMatch(/out of power/i)
  })

// --- Recall -----------------------------------------------------------------

describe('RECALL_CARD', () => {
  it('returns a power card placed this turn to the hand', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[power(8, 0)], [], [], []],
      lockedCount: [0, 0, 0, 0],
      hand: [],
    })
    const next = gameReducer(s, { type: 'RECALL_CARD', columnIndex: 0, slotIndex: 0 })
    expect(next.attacks[0]).toHaveLength(0)
    expect(next.hand).toHaveLength(1)
  })

  it('refuses to recall a card locked from a previous turn', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[power(8, 0), power(2, 0)], [], [], []],
      lockedCount: [1, 0, 0, 0], // slot 0 locked, slot 1 free
    })
    const locked = gameReducer(s, { type: 'RECALL_CARD', columnIndex: 0, slotIndex: 0 })
    expect(locked.message).toMatch(/locked/i)
    expect(locked.attacks[0]).toHaveLength(2)

    const free = gameReducer(s, { type: 'RECALL_CARD', columnIndex: 0, slotIndex: 1 })
    expect(free.attacks[0]).toHaveLength(1)
    expect(free.hand).toHaveLength(1)
  })
})

// --- End of turn ------------------------------------------------------------

describe('END_TURN', () => {
  it('discards the remaining hand to the damage bar and draws anew', () => {
    const s = playing({
      hand: [power(2), power(3)],
      powerDeck: [power(4), power(5), power(6), power(7)],
      attacks: [[power(8)], [], [], []],
    })
    const next = gameReducer(s, { type: 'END_TURN' })
    expect(next.damagePile).toHaveLength(2)
    expect(next.hand).toHaveLength(HAND_SIZE)
    expect(next.powerDeck).toHaveLength(1)
    expect(next.lockedCount[0]).toBe(1) // partial attack locked in
    expect(next.selectedHandIndex).toBeNull()
  })

  it('loses when the damage bar reaches the maximum', () => {
    const s = playing({
      damagePile: Array.from({ length: MAX_DAMAGE - 2 }, () => power(2)),
      hand: [power(3), power(4)],
      powerDeck: [power(5), power(6), power(7)],
    })
    const next = gameReducer(s, { type: 'END_TURN' })
    expect(next.damagePile).toHaveLength(MAX_DAMAGE)
    expect(next.phase).toBe('lost')
  })

  it('loses when the power deck runs out with monsters remaining', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [], [], []],
      hand: [],
      powerDeck: [],
    })
    const next = gameReducer(s, { type: 'END_TURN' })
    expect(next.phase).toBe('lost')
    expect(next.message).toMatch(/out of power/i)
  })
})

// --- BACK_TO_MENU -----------------------------------------------------------

describe('BACK_TO_MENU', () => {
  it('resets to initialState from any phase', () => {
    const won = playing({ phase: 'won', score: 10, message: 'You won!' })
    const back = gameReducer(won, { type: 'BACK_TO_MENU' })
    expect(back.phase).toBe('idle')
    expect(back.hand).toHaveLength(0)
    expect(back.dungeonColumns).toEqual([[], [], [], []])
    expect(back.score).toBeNull()
  })
})

// --- Terminal states --------------------------------------------------------

describe('terminal states', () => {
  it('ignores gameplay actions once won or lost', () => {
    const won = playing({ phase: 'won', hand: [power(5)], selectedHandIndex: 0 })
    expect(gameReducer(won, { type: 'SELECT_HAND', index: 0 })).toBe(won)
    expect(gameReducer(won, { type: 'PLACE_CARD', columnIndex: 0 })).toBe(won)
    expect(gameReducer(won, { type: 'END_TURN' })).toBe(won)

    const lost = playing({ phase: 'lost' })
    expect(gameReducer(lost, { type: 'END_TURN' })).toBe(lost)
  })
})

// --- placementError (used by the UI to highlight legal targets) -------------

describe('placementError', () => {
  it('allows any card into an open power slot', () => {
    const s = playing({ dungeonColumns: [[monster(13, 2)], [], [], []] })
    expect(placementError(s, power(2, 0), 0)).toBeNull()
  })

  it('explains an illegal trigger', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 2)], [], [], []],
      attacks: [[power(4), power(4)], [], [], []],
    })
    expect(placementError(s, power(9, 2), 0)).toMatch(/needs 13/i)
  })

  it('names monsters for display', () => {
    expect(monsterName(monster(11, 2))).toBe('Jack of Hearts')
    expect(monsterName(monster(13, 3))).toBe('King of Spades')
  })
})
