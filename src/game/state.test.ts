import { describe, it, expect } from 'vitest'
import type { CardData } from '../components/Card'
import {
  gameReducer,
  initialState,
  defaultSettings,
  cardPower,
  isCovered,
  isCoveredBy,
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
    dungeonGrid: [],
    attacks: [],
    lockedCount: [],
    hand: [],
    powerDeck: [],
    ...overrides,
  }
}

// Helpers for building 2D grid/attack/lock arrays with a single row.
function g1(...cells: (CardData | null)[]): (CardData | null)[][] { return [cells] }
function a1(...cells: (CardData[] | null)[]): (CardData[] | null)[][] { return [cells] }
function l1(...cells: (number | null)[]): (number | null)[][] { return [cells] }

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

// --- isCovered --------------------------------------------------------------

describe('isCovered', () => {
  it('bottom row (last) is never covered', () => {
    const grid: (CardData | null)[][] = [
      [monster(11, 0), monster(12, 1)],
    ]
    expect(isCovered(grid, 0, 0)).toBe(false)
    expect(isCovered(grid, 0, 1)).toBe(false)
  })

  it('standard layout: every cell in rows 0-1 is covered by the row below', () => {
    // 3 rows of width 4 — every row above is fully covered
    const grid: (CardData | null)[][] = [
      [monster(11,0), monster(12,0), monster(13,0), monster(11,1)],
      [monster(12,1), monster(13,1), monster(11,2), monster(12,2)],
      [monster(13,2), monster(11,3), monster(12,3), monster(13,3)],
    ]
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) expect(isCovered(grid, r, c)).toBe(true)
    }
    for (let c = 0; c < 4; c++) expect(isCovered(grid, 2, c)).toBe(false)
  })

  it('narrow-over-wide: centre-only covers only cells within distance 1', () => {
    // Row 0 width 1, row 1 width 3 (pyramid top two rows)
    // Row 0 col 0 pos = 0; row 1 col 0 pos = -1, col 1 pos = 0, col 2 pos = 1
    const grid: (CardData | null)[][] = [
      [monster(11, 0)],
      [monster(12, 0), monster(12, 1), monster(12, 2)],
    ]
    expect(isCovered(grid, 0, 0)).toBe(true) // covered by all 3 below
    // Row 1 is the bottom row — not covered
    expect(isCovered(grid, 1, 0)).toBe(false)
    expect(isCovered(grid, 1, 1)).toBe(false)
    expect(isCovered(grid, 1, 2)).toBe(false)
  })

  it('wide-over-narrow: edge cells overhang and are uncovered', () => {
    // Row 0 width 3, row 1 width 1 — edge cells of row 0 overhang
    const grid: (CardData | null)[][] = [
      [monster(11, 0), monster(12, 1), monster(11, 2)],
      [monster(13, 0)],
    ]
    // Row 0 col 0 pos = -1; row 1 col 0 pos = 0 → |-1 - 0| = 1 ≥ 1 → NOT covered
    expect(isCovered(grid, 0, 0)).toBe(false)
    // Row 0 col 1 pos = 0; |0 - 0| = 0 < 1 → covered
    expect(isCovered(grid, 0, 1)).toBe(true)
    // Row 0 col 2 pos = 1; |1 - 0| = 1 ≥ 1 → NOT covered
    expect(isCovered(grid, 0, 2)).toBe(false)
  })

  it('null cells in the below row do not cover', () => {
    const grid: (CardData | null)[][] = [
      [monster(11, 0)],
      [null],
    ]
    expect(isCovered(grid, 0, 0)).toBe(false)
  })
})

// --- NEW_GAME ---------------------------------------------------------------

describe('NEW_GAME', () => {
  const state = gameReducer(initialState, { type: 'NEW_GAME' })

  it('enters play with standard layout: 3 rows of 4 monsters', () => {
    expect(state.phase).toBe('playing')
    expect(state.dungeonGrid).toHaveLength(3)
    for (const row of state.dungeonGrid) expect(row).toHaveLength(4)
    const monsters = state.dungeonGrid.flat()
    expect(monsters).toHaveLength(12)
    for (const m of monsters) {
      expect(m!.front.rank).toBeGreaterThanOrEqual(11)
      expect(m!.front.rank).toBeLessThanOrEqual(13)
      expect(m!.front.joker).toBeUndefined()
    }
  })

  it('reveals only initially uncovered cells (bottom row for standard)', () => {
    const grid = state.dungeonGrid
    // Rows 0 and 1 are all covered → face-down
    for (let r = 0; r < 2; r++) {
      for (const cell of grid[r]) expect(cell?.faceUp).toBe(false)
    }
    // Row 2 (bottom) is uncovered → face-up
    for (const cell of grid[2]) expect(cell?.faceUp).toBe(true)
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
    const custom: GameSettings = { boomersAce: true, powerReserve: false, kingAbilities: true, layout: 'standard' }
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: custom })
    expect(s.settings).toEqual(custom)
  })

  it('NEW_GAME with tall layout creates 4 rows of 3 monsters', () => {
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: { ...defaultSettings, layout: 'tall' } })
    expect(s.dungeonGrid).toHaveLength(4)
    for (const row of s.dungeonGrid) expect(row).toHaveLength(3)
    expect(s.attacks).toHaveLength(4)
    expect(s.lockedCount).toHaveLength(4)
    expect(s.dungeonGrid.flat()).toHaveLength(12)
  })

  it('NEW_GAME with spires layout creates 6 rows with widths [1,2,3,1,2,3]', () => {
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: { ...defaultSettings, layout: 'spires' } })
    const widths = s.dungeonGrid.map(r => r.length)
    expect(widths).toEqual([1, 2, 3, 1, 2, 3])
    expect(s.attacks).toHaveLength(6)
    expect(s.lockedCount).toHaveLength(6)
    expect(s.dungeonGrid.flat()).toHaveLength(12)
  })

  it('each layout initially reveals exactly the uncovered cells', () => {
    for (const layout of ['standard', 'tall', 'pyramid', 'hourglass', 'spires'] as const) {
      const s = gameReducer(initialState, { type: 'NEW_GAME', settings: { ...defaultSettings, layout } })
      const grid = s.dungeonGrid
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const cell = grid[r][c]
          expect(cell).not.toBeNull()
          expect(cell!.faceUp).toBe(!isCoveredBy(s.coverableBy, grid, r, c))
        }
      }
    }
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
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(5)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.message).toMatch(/select/i)
    expect(next.attacks[0][0]).toHaveLength(0)
  })

  it('rejects a cell with no monster', () => {
    const s = playing({ hand: [power(5)], selectedHandIndex: 0 })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.message).toMatch(/no monster/i)
  })

  it('places the first two cards as power and consumes them from hand', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 2), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(6, 0), power(7, 1)],
      selectedHandIndex: 0,
    })
    const first = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(first.attacks[0][0]).toHaveLength(1)
    expect(first.hand).toHaveLength(1)
    expect(first.selectedHandIndex).toBeNull()

    const withSecond = gameReducer(first, { type: 'SELECT_HAND', index: 0 })
    const second = gameReducer(withSecond, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(second.attacks[0][0]).toHaveLength(2)
    expect(second.hand).toHaveLength(0)
    expect(powerSum(second.attacks[0][0]!)).toBe(13)
  })
})

// --- Placement: trigger / defeat -------------------------------------------

describe('PLACE_CARD trigger', () => {
  it('rejects a trigger when the two power cards are too weak', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 2), null, null, null),
      attacks: a1([power(4), power(5)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(2, 2)],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.message).toMatch(/needs 13/i)
    expect(next.dungeonGrid[0][0]).not.toBeNull()
  })

  it('rejects a trigger of the wrong suit', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 2), null, null, null),
      attacks: a1([power(6), power(6)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(9, 0)],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.message).toMatch(/hearts/i)
    expect(next.dungeonGrid[0][0]).not.toBeNull()
  })

  it('defeats a monster with a valid trigger and reveals the next', () => {
    // Two-row grid: Queen in row 0 (deep), Jack in row 1 (front/active).
    const s = playing({
      dungeonGrid: [
        [monster(12, 3), null, null, null],
        [monster(11, 2), null, null, null],
      ],
      attacks: [
        [[], null, null, null] as (CardData[] | null)[],
        [[power(6), power(6)], null, null, null],
      ],
      lockedCount: [
        [0, null, null, null],
        [0, null, null, null],
      ],
      hand: [power(3, 2)],
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 1, col: 0 })
    expect(next.dungeonGrid[0][0]).not.toBeNull()   // Queen still present
    expect(next.dungeonGrid[0][0]?.faceUp).toBe(true) // Queen revealed
    expect(next.dungeonGrid[1][0]).toBeNull()         // Jack defeated
    expect(next.attacks[1][0]).toBeNull()
    expect(next.lockedCount[1][0]).toBeNull()
    expect(next.clearPile).toHaveLength(4) // 2 power + trigger + monster
    expect(next.hand).toHaveLength(HAND_SIZE) // auto-drew after emptying hand
    expect(next.phase).toBe('playing')
    expect(next.message).toMatch(/defeated/i)
  })

  it('accepts a joker as a wild trigger', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 3), null, null, null),
      attacks: a1([power(7), power(7)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [joker(2)],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.dungeonGrid[0][0]).toBeNull()
    expect(next.clearPile).toHaveLength(4)
  })

  it('counts a joker power card as 10', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 1), null, null, null),
      attacks: a1([joker(0), power(3)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(5, 1)],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.dungeonGrid[0][0]).toBeNull()
  })

  it('wins and scores when the last monster falls', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 2), null, null, null),
      attacks: a1([power(6), power(6)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(4, 2)],
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.phase).toBe('won')
    expect(next.score).toBe(3)
    expect(next.message).toMatch(/cleared/i)
  })
})

  it('auto-draws after defeating a monster when the last hand card is used', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 2), monster(13, 0), null, null),
      attacks: a1([power(6), power(6)], [], null, null),
      lockedCount: l1(0, 0, null, null),
      hand: [power(4, 2)],
      selectedHandIndex: 0,
      powerDeck: [power(1), power(2), power(3)],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.phase).toBe('playing')
    expect(next.hand).toHaveLength(HAND_SIZE)
    expect(next.powerDeck).toHaveLength(0)
    expect(next.message).toMatch(/defeated/i)
  })

  it('loses when auto-draw finds an empty power deck with monsters remaining', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 2), monster(13, 0), null, null),
      attacks: a1([power(6), power(6)], [], null, null),
      lockedCount: l1(0, 0, null, null),
      hand: [power(4, 2)],
      selectedHandIndex: 0,
      powerDeck: [],
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.phase).toBe('lost')
    expect(next.message).toMatch(/out of power/i)
  })

// --- Recall -----------------------------------------------------------------

describe('RECALL_CARD', () => {
  it('returns a power card placed this turn to the hand', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([power(8, 0)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [],
    })
    const next = gameReducer(s, { type: 'RECALL_CARD', row: 0, col: 0, slotIndex: 0 })
    expect(next.attacks[0][0]).toHaveLength(0)
    expect(next.hand).toHaveLength(1)
  })

  it('refuses to recall a card locked from a previous turn', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([power(8, 0), power(2, 0)], null, null, null),
      lockedCount: l1(1, null, null, null), // slot 0 locked, slot 1 free
    })
    const locked = gameReducer(s, { type: 'RECALL_CARD', row: 0, col: 0, slotIndex: 0 })
    expect(locked.message).toMatch(/locked/i)
    expect(locked.attacks[0][0]).toHaveLength(2)

    const free = gameReducer(s, { type: 'RECALL_CARD', row: 0, col: 0, slotIndex: 1 })
    expect(free.attacks[0][0]).toHaveLength(1)
    expect(free.hand).toHaveLength(1)
  })
})

// --- End of turn ------------------------------------------------------------

describe('END_TURN', () => {
  it('discards the remaining hand to the damage bar and draws anew', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([power(8)], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(2), power(3)],
      powerDeck: [power(4), power(5), power(6), power(7)],
    })
    const next = gameReducer(s, { type: 'END_TURN' })
    expect(next.damagePile).toHaveLength(2)
    expect(next.hand).toHaveLength(HAND_SIZE)
    expect(next.powerDeck).toHaveLength(1)
    expect(next.lockedCount[0][0]).toBe(1) // partial attack locked in
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
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
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
    expect(back.dungeonGrid).toEqual([])
    expect(back.score).toBeNull()
  })
})

// --- Terminal states --------------------------------------------------------

describe('terminal states', () => {
  it('ignores gameplay actions once won or lost', () => {
    const won = playing({ phase: 'won', hand: [power(5)], selectedHandIndex: 0 })
    expect(gameReducer(won, { type: 'SELECT_HAND', index: 0 })).toBe(won)
    expect(gameReducer(won, { type: 'PLACE_CARD', row: 0, col: 0 })).toBe(won)
    expect(gameReducer(won, { type: 'END_TURN' })).toBe(won)

    const lost = playing({ phase: 'lost' })
    expect(gameReducer(lost, { type: 'END_TURN' })).toBe(lost)
  })
})

// --- placementError (used by the UI to highlight legal targets) -------------

describe('placementError', () => {
  it('allows any card into an open power slot', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 2), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(placementError(s, power(2, 0), 0, 0)).toBeNull()
  })

  it('explains an illegal trigger', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 2), null, null, null),
      attacks: a1([power(4), power(4)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(placementError(s, power(9, 2), 0, 0)).toMatch(/needs 13/i)
  })

  it('names monsters for display', () => {
    expect(monsterName(monster(11, 2))).toBe('Jack of Hearts')
    expect(monsterName(monster(13, 3))).toBe('King of Spades')
  })
})

// --- hasInsufficientAttack --------------------------------------------------

describe('hasInsufficientAttack', () => {
  it('returns false when no attacks are placed', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns false with one power card placed (slot still open)', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 0), null, null, null),
      attacks: a1([power(2)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns false when two power cards sum to >= monster level', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([power(6), power(6)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })

  it('returns true when two power cards sum to < monster level', () => {
    const s = playing({
      dungeonGrid: g1(monster(13, 0), null, null, null),
      attacks: a1([power(3), power(4)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(true)
  })

  it('returns true even if only one cell is deadlocked', () => {
    const s = playing({
      dungeonGrid: g1(monster(11, 0), monster(13, 1), null, null),
      attacks: a1([power(6), power(6)], [power(2), power(3)], null, null),
      lockedCount: l1(0, 0, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(true)
  })

  it('accounts for boomers-ace power values', () => {
    const boomers = { boomersAce: true, powerReserve: false, kingAbilities: false, layout: 'standard' as const }
    const s = playing({
      settings: boomers,
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([power(1), power(1)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    expect(hasInsufficientAttack(s)).toBe(false)
  })
})

// --- Power Reserve variant --------------------------------------------------

describe('Power Reserve', () => {
  const withReserve: GameSettings = { boomersAce: false, powerReserve: true, kingAbilities: false, layout: 'standard' }

  it('NEW_GAME with powerReserve enters reserve-selection phase with 5 cards in the pool', () => {
    const s = gameReducer(initialState, { type: 'NEW_GAME', settings: withReserve })
    expect(s.phase).toBe('reserve-selection')
    expect(s.selectionPool).toHaveLength(5)
    expect(s.selectionPool.every(c => c.faceUp)).toBe(true)
    expect(s.hand).toHaveLength(0)
    expect(s.reserve).toHaveLength(0)
    expect(s.powerDeck).toHaveLength(42 - 5)
  })

  it('CONFIRM_RESERVE splits pool into reserve (2) and hand (3), enters playing', () => {
    const pool = [power(1), power(2), power(3), power(4), power(5)]
    const s: GameState = { ...initialState, phase: 'reserve-selection' as const, selectionPool: pool, settings: withReserve }
    const next = gameReducer(s, { type: 'CONFIRM_RESERVE', reserveIndices: [1, 3] })
    expect(next.phase).toBe('playing')
    expect(next.reserve.map(c => c.front.rank)).toEqual([2, 4])
    expect(next.hand.map(c => c.front.rank).sort()).toEqual([1, 3, 5])
    expect(next.selectionPool).toHaveLength(0)
  })

  it('NEW_GAME without powerReserve goes straight to playing with no selectionPool', () => {
    const s = gameReducer(initialState, { type: 'NEW_GAME' })
    expect(s.phase).toBe('playing')
    expect(s.selectionPool).toHaveLength(0)
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
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [power(3)],
      reserve: [power(8), power(5)],
      selectedReserveIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.reserve).toHaveLength(1)
    expect(next.attacks[0][0]).toHaveLength(1)
    expect(next.hand).toHaveLength(1)
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
    expect(next.damagePile).toHaveLength(1)
  })
})

// --- Boomer-Ace variant -----------------------------------------------------

describe('Boomer-Ace', () => {
  const boomers: GameSettings = { boomersAce: true, powerReserve: false, kingAbilities: false, layout: 'standard' }

  it('scores an Ace as 11 with boomersAce on, 1 without', () => {
    const ace = power(1)
    expect(cardPower(ace, { boomersAce: false, powerReserve: false, kingAbilities: false, layout: 'standard' })).toBe(1)
    expect(cardPower(ace, boomers)).toBe(11)
  })

  it('an Ace in a power slot contributes 11 to powerSum', () => {
    const attack = [power(1), power(3)]
    expect(powerSum(attack, boomers)).toBe(14)
    expect(powerSum(attack)).toBe(4)
  })

  it('allows an Ace to serve as a trigger and returns it to hand', () => {
    const ace = power(1, 0)
    const s = playing({
      settings: boomers,
      dungeonGrid: g1(monster(11, 0), monster(13, 1), null, null),
      attacks: a1([power(6, 0), power(7, 1)], [], null, null),
      lockedCount: l1(0, 0, null, null),
      hand: [ace],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.phase).toBe('playing')
    expect(next.hand).toContainEqual(expect.objectContaining({ front: { rank: 1, suit: 0 } }))
    expect(next.clearPile).not.toContainEqual(expect.objectContaining({ front: { rank: 1, suit: 0 } }))
  })

  it('does not return a Joker trigger to hand under boomersAce', () => {
    const j = joker(0)
    const s = playing({
      settings: boomers,
      dungeonGrid: g1(monster(11, 0), monster(13, 1), null, null),
      attacks: a1([power(6, 0), power(7, 1)], [], null, null),
      lockedCount: l1(0, 0, null, null),
      hand: [j],
      selectedHandIndex: 0,
    })
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.hand).not.toContainEqual(expect.objectContaining({ front: { joker: true } }))
  })
})

// --- King abilities variant -------------------------------------------------

describe('King abilities', () => {
  const kingsOn: GameSettings = { boomersAce: false, powerReserve: false, kingAbilities: true, layout: 'standard' }

  function kingSetup() {
    const king = monster(13, 0)
    const trigger = power(5, 0)
    return playing({
      settings: kingsOn,
      dungeonGrid: g1(king, monster(11, 1), null, null),
      attacks: a1([power(7), power(7)], [], null, null),
      lockedCount: l1(0, 0, null, null),
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
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
    expect(next.inventory).toHaveLength(1)
    expect(next.inventory[0].front.rank).toBe(13)
    expect(next.clearPile.every(c => c.front.rank !== 13)).toBe(true)
  })

  it('defeated King goes to clearPile with kingAbilities off', () => {
    const s = { ...kingSetup(), settings: { ...kingsOn, kingAbilities: false } }
    const next = gameReducer(s, { type: 'PLACE_CARD', row: 0, col: 0 })
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

  it('ACTIVATE_KING K♦ sets pendingKingAbility for peek (does not draw immediately)', () => {
    const bottomCard = power(9)
    const king = { ...monster(13, 1), faceUp: true }
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      hand: [power(2)],
      powerDeck: [power(3), power(4), bottomCard],
    })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.pendingKingAbility).toEqual(king)
    expect(next.hand).toHaveLength(1)
    expect(next.powerDeck).toHaveLength(3)
    expect(next.inventory).toHaveLength(1)
  })

  it('USE_KING_DIAMONDS take moves bottom card to top of deck', () => {
    const bottomCard = power(9)
    const king = { ...monster(13, 1), faceUp: true }
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      hand: [power(2)],
      powerDeck: [power(3), power(4), bottomCard],
      pendingKingAbility: king,
    })
    const next = gameReducer(s, { type: 'USE_KING_DIAMONDS', choice: 'take' })
    expect(next.powerDeck[0].front.rank).toBe(9)
    expect(next.powerDeck).toHaveLength(3)
    expect(next.inventory).toHaveLength(0)
    expect(next.pendingKingAbility).toBeNull()
  })

  it('USE_KING_DIAMONDS leave leaves deck unchanged', () => {
    const bottomCard = power(9)
    const king = { ...monster(13, 1), faceUp: true }
    const s = playing({
      settings: kingsOn,
      inventory: [king],
      powerDeck: [power(3), power(4), bottomCard],
      pendingKingAbility: king,
    })
    const next = gameReducer(s, { type: 'USE_KING_DIAMONDS', choice: 'leave' })
    expect(next.powerDeck[2].front.rank).toBe(9)
    expect(next.powerDeck).toHaveLength(3)
    expect(next.inventory).toHaveLength(0)
    expect(next.pendingKingAbility).toBeNull()
  })

  it('ACTIVATE_KING K♥ sets pendingKingAbility', () => {
    const king = { ...monster(13, 2), faceUp: true }
    const s = playing({ settings: kingsOn, inventory: [king], hand: [power(3)] })
    const next = gameReducer(s, { type: 'ACTIVATE_KING', kingCard: king })
    expect(next.pendingKingAbility).toEqual(king)
    expect(next.inventory).toHaveLength(1)
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
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([weakCard, power(4)], null, null, null),
      lockedCount: l1(0, null, null, null),
    })
    const next = gameReducer(s, { type: 'USE_KING_SPADES', row: 0, col: 0, slotIndex: 0 })
    expect(next.attacks[0][0]![0].front.boosted).toBe(true)
    expect(cardPower(next.attacks[0][0]![0])).toBe(6)
    expect(next.inventory).toHaveLength(0)
    expect(next.pendingKingAbility).toBeNull()
  })

  it('RECALL_CARD removes the boost from a boosted card', () => {
    const boostedCard = { faceUp: true, front: { rank: 3, suit: 0, boosted: true as const }, back: { color: 'Blue' as const, version: 1 as const } }
    const s = playing({
      dungeonGrid: g1(monster(11, 0), null, null, null),
      attacks: a1([boostedCard], null, null, null),
      lockedCount: l1(0, null, null, null),
      hand: [],
    })
    const next = gameReducer(s, { type: 'RECALL_CARD', row: 0, col: 0, slotIndex: 0 })
    expect(next.hand[0].front.boosted).toBeUndefined()
  })

  it('CANCEL_KING_ABILITY clears pendingKingAbility', () => {
    const king = { ...monster(13, 3), faceUp: true }
    const s = playing({ settings: kingsOn, pendingKingAbility: king })
    const next = gameReducer(s, { type: 'CANCEL_KING_ABILITY' })
    expect(next.pendingKingAbility).toBeNull()
  })
})
