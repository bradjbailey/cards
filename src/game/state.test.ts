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
  hasInsufficientAttack,
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

// --- hasInsufficientAttack --------------------------------------------------

describe('hasInsufficientAttack', () => {
  it('returns false when no attacks are placed', () => {
    const s = playing({ dungeonColumns: [[monster(11, 0)], [], [], []] })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns false with one power card placed (slot still open)', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 0)], [], [], []],
      attacks: [[power(2)], [], [], []],
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns false when two power cards sum to >= monster level', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[power(6), power(6)], [], [], []],
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns true when two power cards sum to < monster level', () => {
    const s = playing({
      dungeonColumns: [[monster(13, 0)], [], [], []],
      attacks: [[power(3), power(4)], [], [], []], // 7 < 13
    })
    expect(hasInsufficientAttack(s)).toBe(true)
  })

  it('returns true even if only one column is deadlocked', () => {
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [monster(13, 1)], [], []],
      attacks: [[power(6), power(6)], [power(2), power(3)], [], []], // col 1 ok, col 2 deadlocked
    })
    expect(hasInsufficientAttack(s)).toBe(true)
  })

  it('accounts for boomers-ace power values', () => {
    const boomers = { boomersAce: true, powerReserve: false, kingAbilities: false }
    // Ace worth 11 with boomers: 1 + 11 = 12, enough for a Jack (11)
    const s = playing({
      settings: boomers,
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[power(1), power(1)], [], [], []], // 11+11=22 >= 11
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })
})

// --- Power Reserve variant --------------------------------------------------

describe('Power Reserve', () => {
  const withReserve: GameSettings = { boomersAce: false, powerReserve: true, kingAbilities: false }

  it('NEW_GAME deals 2 reserve cards and shrinks the power deck by 2', () => {
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: withReserve })
    expect(s.reserve).toHaveLength(2)
    expect(s.reserve.every(c => c.faceUp)).toBe(true)
    expect(s.powerDeck).toHaveLength(42 - HAND_SIZE - 2)
  })

  it('SELECT_RESERVE selects and deselects a reserve card', () => {
    const s = playing({ settings: withReserve, reserve: [power(5), power(6)], selectedHandIndex: null })
    const sel = gameReducer(s, { type: 'SELECT_RESERVE', index: 1 })
    expect(sel.selectedReserveIndex).toBe(1)
    expect(sel.selectedHandIndex).toBeNull()
    const desel = gameReducer(sel, { type: 'SELECT_RESERVE', index: 1 })
    expect(desel.selectedReserveIndex).toBeNull()
  })

  it('SELECT_RESERVE clears selectedHandIndex, SELECT_HAND clears selectedReserveIndex', () => {
    const s = playing({
      settings: withReserve,
      hand: [power(3)],
      reserve: [power(5)],
      selectedHandIndex: 0,
    })
    const afterReserve = gameReducer(s, { type: 'SELECT_RESERVE', index: 0 })
    expect(afterReserve.selectedHandIndex).toBeNull()
    expect(afterReserve.selectedReserveIndex).toBe(0)

    const afterHand = gameReducer(afterReserve, { type: 'SELECT_HAND', index: 0 })
    expect(afterHand.selectedReserveIndex).toBeNull()
    expect(afterHand.selectedHandIndex).toBe(0)
  })

  it('PLACE_CARD from reserve consumes the reserve card', () => {
    const s = playing({
      settings: withReserve,
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[], [], [], []],
      hand: [power(3)],
      reserve: [power(8), power(5)],
      selectedReserveIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.reserve).toHaveLength(1)
    expect(next.attacks[0]).toHaveLength(1)
    expect(next.hand).toHaveLength(1) // hand unchanged
  })

  it('END_TURN does not discard reserve cards', () => {
    const s = playing({
      settings: withReserve,
      reserve: [power(7), power(8)],
      hand: [power(2)],
      powerDeck: [power(3), power(4), power(5)],
    })
    const next = gameReducer(s, { type: 'END_TURN' })
    expect(next.reserve).toHaveLength(2)
    expect(next.damagePile).toHaveLength(1) // only hand card discarded
  })
})

// --- Boomer-Ace variant -----------------------------------------------------

describe('Boomer-Ace', () => {
  const boomers: GameSettings = { boomersAce: true, powerReserve: false, kingAbilities: false }

  it('scores an Ace as 11 with boomersAce on, 1 without', () => {
    const ace = power(1)
    expect(cardPower(ace, { boomersAce: false, powerReserve: false, kingAbilities: false })).toBe(1)
    expect(cardPower(ace, boomers)).toBe(11)
  })

  it('an Ace in a power slot contributes 11 to powerSum', () => {
    const attack = [power(1), power(3)]
    expect(powerSum(attack, boomers)).toBe(14)
    expect(powerSum(attack)).toBe(4) // base game unchanged
  })

  it('allows an Ace to serve as a trigger and returns it to hand', () => {
    const ace = power(1, 0) // Ace of Clubs
    const s = playing({
      settings: boomers,
      dungeonColumns: [[monster(11, 0)], [monster(13, 1)], [], []],
      attacks: [[power(6, 0), power(7, 1)], [], [], []],
      hand: [ace],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.phase).toBe('playing')
    expect(next.hand).toContainEqual(expect.objectContaining({ front: { rank: 1, suit: 0 } }))
    expect(next.clearPile).not.toContainEqual(expect.objectContaining({ front: { rank: 1, suit: 0 } }))
  })

  it('does not return a Joker trigger to hand under boomersAce', () => {
    const j = joker(0)
    const s = playing({
      settings: boomers,
      dungeonColumns: [[monster(11, 0)], [monster(13, 1)], [], []],
      attacks: [[power(6, 0), power(7, 1)], [], [], []],
      hand: [j],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.hand).not.toContainEqual(expect.objectContaining({ front: { joker: true } }))
  })
})

// --- King abilities variant -------------------------------------------------

describe('King abilities', () => {
  const kingsOn: GameSettings = { boomersAce: false, powerReserve: false, kingAbilities: true }

  // Helper: a state with a King as the active monster, 2 power cards placed,
  // and a matching trigger card selected so PLACE_CARD will defeat the King.
  function kingSetup() {
    const king = monster(13, 0) // King of Clubs
    const trigger = power(5, 0) // Clubs trigger
    return playing({
      settings: kingsOn,
      dungeonColumns: [[king], [monster(11, 1)], [], []],
      attacks: [[power(7), power(7)], [], [], []],
      hand: [trigger],
      selectedHandIndex: 0,
    })
  }

  it('cardPower doubles when card is boosted', () => {
    const boosted = { faceUp: true, front: { rank: 5, suit: 0, boosted: true as const }, back: { color: 'Blue' as const, version: 1 as const } }
    expect(cardPower(boosted)).toBe(10)
    expect(cardPower(boosted, kingsOn)).toBe(10)
    const plain = power(5)
    expect(cardPower(plain)).toBe(5)
  })

  it('defeated King goes to inventory with kingAbilities on', () => {
    const s = kingSetup()
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.inventory).toHaveLength(1)
    expect(next.inventory[0].front.rank).toBe(13)
    expect(next.clearPile.every(c => c.front.rank !== 13)).toBe(true)
  })

  it('defeated King goes to clearPile with kingAbilities off', () => {
    const s = { ...kingSetup(), settings: { ...kingsOn, kingAbilities: false } }
    const next = gameReducer(s, { type: 'PLACE_CARD', columnIndex: 0 })
    expect(next.inventory).toHaveLength(0)
    expect(next.clearPile.some(c => c.front.rank === 13)).toBe(true)
  })

  it('ACTIVATE_KING K♣ draws a card from the top of the deck', () => {
    const topCard = power(9)
    const king = { ...monster(13, 0), faceUp: true }
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      hand: [power(2)],
      powerDeck: [topCard, power(3)],
    })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.hand).toHaveLength(2)
    expect(next.hand[1].front.rank).toBe(9)
    expect(next.inventory).toHaveLength(0)
    expect(next.powerDeck).toHaveLength(1)
  })

  it('ACTIVATE_KING K♦ draws the bottom card of the deck', () => {
    const bottomCard = power(9)
    const king = { ...monster(13, 1), faceUp: true }
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      hand: [power(2)],
      powerDeck: [power(3), power(4), bottomCard],
    })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.hand).toHaveLength(2)
    expect(next.hand[1].front.rank).toBe(9)
    expect(next.powerDeck).toHaveLength(2)
    expect(next.inventory).toHaveLength(0)
  })

  it('ACTIVATE_KING K♥ sets pendingKingAbility', () => {
    const king = { ...monster(13, 2), faceUp: true }
    const s = playing({ settings: kingsOn, inventory: [king], hand: [power(3)] })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.pendingKingAbility).toEqual(king)
    expect(next.inventory).toHaveLength(1) // not consumed yet
  })

  it('ACTIVATE_KING K♠ sets pendingKingAbility', () => {
    const king = { ...monster(13, 3), faceUp: true }
    const s = playing({ settings: kingsOn, inventory: [king] })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.pendingKingAbility).toEqual(king)
  })

  it('USE_KING_HEARTS buries a hand card on the bottom of the deck', () => {
    const king = { ...monster(13, 2), faceUp: true }
    const buried = power(7)
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      pendingKingAbility: king,
      hand: [power(2), buried, power(5)],
      powerDeck: [power(3), power(4)],
    })
    const next = gameReducer(s, { type: 'USE_KING_HEARTS', handIndex: 1 })
    expect(next.hand).toHaveLength(2)
    expect(next.hand.some(c => c.front.rank === 7)).toBe(false)
    expect(next.powerDeck[next.powerDeck.length - 1].front.rank).toBe(7)
    expect(next.inventory).toHaveLength(0)
    expect(next.pendingKingAbility).toBeNull()
  })

  it('USE_KING_SPADES doubles the power of an attack card', () => {
    const king = { ...monster(13, 3), faceUp: true }
    const weakCard = power(3)
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      pendingKingAbility: king,
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[weakCard, power(4)], [], [], []],
    })
    const next = gameReducer(s, { type: 'USE_KING_SPADES', columnIndex: 0, slotIndex: 0 })
    expect(next.attacks[0][0].front.boosted).toBe(true)
    expect(cardPower(next.attacks[0][0])).toBe(6)
    expect(next.inventory).toHaveLength(0)
    expect(next.pendingKingAbility).toBeNull()
  })

  it('RECALL_CARD removes the boost from a boosted card', () => {
    const boostedCard = { faceUp: true, front: { rank: 3, suit: 0, boosted: true as const }, back: { color: 'Blue' as const, version: 1 as const } }
    const s = playing({
      dungeonColumns: [[monster(11, 0)], [], [], []],
      attacks: [[boostedCard], [], [], []],
      lockedCount: [0, 0, 0, 0],
      hand: [],
    })
    const next = gameReducer(s, { type: 'RECALL_CARD', columnIndex: 0, slotIndex: 0 })
    expect(next.hand[0].front.boosted).toBeUndefined()
  })

  it('CANCEL_KING_ABILITY clears pendingKingAbility', () => {
    const king = { ...monster(13, 3), faceUp: true }
    const s = playing({ settings: kingsOn, pendingKingAbility: king })
    const next = gameReducer(s, { type: 'CANCEL_KING_ABILITY' })
    expect(next.pendingKingAbility).toBeNull()
  })
})
