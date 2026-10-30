import type { CardData, BackOfCard } from '../components/Card'
import { createFullDeck, shuffle, separateDecks } from './deck'
import { getLayout, DEFAULT_LAYOUT, type LayoutKey, type ExtraCover } from './layouts'

/**
 * Clear the Dungeon — core game logic.
 *
 * This module is the single source of truth for the rules. It is intentionally
 * decoupled from React and from the card image assets: it only uses `CardData`
 * as a *type* (erased at runtime), so it can be unit-tested with no DOM, no
 * Vite asset handling, and no component imports.
 *
 * Rules summary (base game):
 *  - Monsters are the 12 face cards. Power level = rank: Jack 11, Queen 12, King 13.
 *  - Power deck is A(1)-10 plus two Jokers (42 cards). Jokers are worth 10 and
 *    are any suit.
 *  - Defeating a monster always costs exactly 3 cards: two "power" cards whose
 *    values sum to >= the monster's level, then a "trigger" card whose suit
 *    matches the monster (Jokers match any suit). The monster dies the instant
 *    the trigger lands.
 *  - Each turn you hold 3 cards. Cards you don't play are discarded to the
 *    damage bar before you draw again. 7 cards in the damage bar = loss.
 *  - Partial attacks persist across turns; that persistence is the core tension.
 *  - Win by clearing all 12 monsters. Score = cards left in the power deck.
 */

export type GamePhase = 'idle' | 'reserve-selection' | 'playing' | 'won' | 'lost'

export interface GameSettings {
  boomersAce: boolean
  powerReserve: boolean
  kingAbilities: boolean
  layout: LayoutKey
  cardBack: BackOfCard
}

export const defaultSettings: GameSettings = {
  boomersAce: false,
  powerReserve: false,
  kingAbilities: false,
  layout: DEFAULT_LAYOUT,
  cardBack: { color: 'Blue', version: 1 },
}

/** Cards drawn into the hand each turn. */
export const HAND_SIZE = 3
/** Damage bar size that triggers a loss. */
export const MAX_DAMAGE = 7
/** Power cards required before a trigger may be played. */
export const POWER_SLOTS = 2
/** Total cards used to defeat one monster (POWER_SLOTS + 1 trigger). */
export const ATTACK_SIZE = POWER_SLOTS + 1

export interface GameState {
  phase: GamePhase
  /**
   * 2D grid [row][col]. Row 0 = top (deepest); last row = front/visible.
   * null = cell defeated. faceUp: true = revealed and attackable.
   */
  dungeonGrid: (CardData | null)[][]
  /**
   * For each cell (r, c): the column indices in row r+1 that cover it.
   * Computed from layout geometry plus any layout-defined extraCovers overrides.
   * Used by isCoveredBy; does not change during play.
   */
  coverableBy: number[][][]
  /**
   * Attack cards per grid cell, parallel to dungeonGrid. null = defeated.
   * Active cells hold 0-2 power cards (trigger immediately defeats, so never 3).
   */
  attacks: (CardData[] | null)[][]
  /**
   * Locked attack count per cell, parallel to dungeonGrid. null = defeated.
   * Cards at slotIndex < lockedCount[r][c] cannot be recalled.
   */
  lockedCount: (number | null)[][]
  powerDeck: CardData[]
  hand: CardData[]
  /** Index into `hand` of the currently selected card, or null. */
  selectedHandIndex: number | null
  /** Always-available reserve cards (Power Reserve variant). Never discarded at end of turn. */
  reserve: CardData[]
  /** Index into `reserve` of the currently selected reserve card, or null. */
  selectedReserveIndex: number | null
  /** Discarded cards. Reaching MAX_DAMAGE ends the game. */
  damagePile: CardData[]
  /** Defeated monsters plus the cards used to defeat them. */
  clearPile: CardData[]
  /** Transient player-facing message (invalid move, defeat, win/loss). */
  message: string | null
  /** Final score (power cards remaining) once the game is won. */
  score: number | null
  /** Active rule variants for this game. */
  settings: GameSettings
  /** Defeated Kings held as one-shot power inventory (King abilities variant). */
  inventory: CardData[]
  /** King currently being activated (awaiting target selection for K♥ and K♠). */
  pendingKingAbility: CardData | null
  /** Cards awaiting reserve selection (Power Reserve variant, reserve-selection phase only). */
  selectionPool: CardData[]
}

export const initialState: GameState = {
  phase: 'idle',
  dungeonGrid: [],
  coverableBy: [],
  attacks: [],
  lockedCount: [],
  powerDeck: [],
  hand: [],
  selectedHandIndex: null,
  reserve: [],
  selectedReserveIndex: null,
  damagePile: [],
  clearPile: [],
  message: null,
  score: null,
  settings: defaultSettings,
  inventory: [],
  pendingKingAbility: null,
  selectionPool: [],
}

export type GameAction =
  | { type: 'NEW_GAME'; settings?: GameSettings }
  | { type: 'BACK_TO_MENU' }
  | { type: 'SELECT_HAND'; index: number }
  | { type: 'SELECT_RESERVE'; index: number }
  | { type: 'PLACE_CARD'; row: number; col: number }
  | { type: 'RECALL_CARD'; row: number; col: number; slotIndex: number }
  | { type: 'END_TURN' }
  | { type: 'ACTIVATE_KING'; kingCard: CardData }
  | { type: 'CANCEL_KING_ABILITY' }
  | { type: 'USE_KING_HEARTS'; handIndex: number }
  | { type: 'USE_KING_SPADES'; row: number; col: number; slotIndex: number }
  | { type: 'USE_KING_DIAMONDS'; choice: 'take' | 'leave' }
  | { type: 'CONFIRM_RESERVE'; reserveIndices: [number, number] }
  | { type: 'DEBUG_SET_STATE'; state: GameState }

// --- Pure helpers (exported for the UI and tests) ---------------------------

const SUIT_NAMES: Record<number, string> = {
  0: 'Clubs',
  1: 'Diamonds',
  2: 'Hearts',
  3: 'Spades',
}

const FACE_NAMES: Record<number, string> = {
  11: 'Jack',
  12: 'Queen',
  13: 'King',
}

export function suitName(suit: number): string {
  return SUIT_NAMES[suit] ?? String(suit)
}

/** Attack value of a power card. Doubles when boosted (K♠ ability); Aces worth 11 with boomersAce. */
export function cardPower(card: CardData, settings: GameSettings = defaultSettings): number {
  if (card.front.joker) return 10
  const base = (settings.boomersAce && card.front.rank === 1) ? 11 : card.front.rank
  return card.front.boosted ? base * 2 : base
}

/** A monster's power level equals its rank (Jack 11, Queen 12, King 13). */
export function monsterLevel(monster: CardData): number {
  return monster.front.rank
}

/** A card may trigger a monster if it is a Joker or shares the monster's suit. */
export function isValidTrigger(card: CardData, monster: CardData): boolean {
  return card.front.joker === true || card.front.suit === monster.front.suit
}

/** Sum of the (up to two) power cards currently placed in an attack. */
export function powerSum(attack: CardData[], settings: GameSettings = defaultSettings): number {
  return attack.slice(0, POWER_SLOTS).reduce((sum, c) => sum + cardPower(c, settings), 0)
}

/**
 * Returns true if the cell at (r, c) is covered by at least one non-null card
 * in row r+1 (the row directly below). Uses the half-integer position formula:
 * a card at column c in a row of width w sits at position c − (w−1)/2, and two
 * cards overlap when their positions differ by less than 1.
 */
export function isCovered(grid: (CardData | null)[][], r: number, c: number): boolean {
  const belowR = r + 1
  if (belowR >= grid.length) return false
  const thisPos = c - (grid[r].length - 1) / 2
  const belowRow = grid[belowR]
  return belowRow.some((cell, bc) => {
    if (cell === null) return false
    const belowPos = bc - (belowRow.length - 1) / 2
    return Math.abs(thisPos - belowPos) < 1
  })
}

/**
 * Builds the `coverableBy` map: for each cell (r, c), the list of column indices
 * in row r+1 that cover it, combining geometric overlap with any layout extraCovers.
 */
function buildCoverableBy(rowWidths: number[], extraCovers: ExtraCover[] = []): number[][][] {
  const result: number[][][] = rowWidths.map((w, r) => {
    const belowW = r + 1 < rowWidths.length ? rowWidths[r + 1] : 0
    return Array.from({ length: w }, (_, c) => {
      if (belowW === 0) return []
      const thisPos = c - (w - 1) / 2
      const cols: number[] = []
      for (let bc = 0; bc < belowW; bc++) {
        if (Math.abs(thisPos - (bc - (belowW - 1) / 2)) < 1) cols.push(bc)
      }
      return cols
    })
  })
  for (const { coverRow, coverCol, coversInRowAbove } of extraCovers) {
    const rAbove = coverRow - 1
    for (const bc of coversInRowAbove) {
      if (result[rAbove]?.[bc] && !result[rAbove][bc].includes(coverCol)) {
        result[rAbove][bc].push(coverCol)
      }
    }
  }
  return result
}

/**
 * Like isCovered, but uses the pre-computed coverableBy map (which includes
 * layout-specific explicit coverage overrides) instead of raw position math.
 */
export function isCoveredBy(
  coverableBy: number[][][],
  grid: (CardData | null)[][],
  r: number,
  c: number,
): boolean {
  return coverableBy[r]?.[c]?.some(bc => grid[r + 1]?.[bc] !== null) ?? false
}

/**
 * Whether placing `card` on cell (row, col) is a legal move right now. Returns
 * a reason string when illegal (suitable for display), or null when legal.
 */
export function placementError(
  state: GameState,
  card: CardData,
  row: number,
  col: number,
): string | null {
  const cell = state.dungeonGrid[row]?.[col]
  if (!cell?.faceUp) return 'No monster to attack there.'

  const attack = state.attacks[row]?.[col] ?? []
  if (attack.length < POWER_SLOTS) return null

  const level = monsterLevel(cell)
  const sum = powerSum(attack, state.settings)
  if (sum < level) {
    return `Power is ${sum}; needs ${level}+. Recall a power card and use a higher one.`
  }
  if (!isValidTrigger(card, cell)) {
    return `Trigger must be ${suitName(cell.front.suit)} (or a Joker).`
  }
  return null
}

export function monsterName(monster: CardData): string {
  const rank = FACE_NAMES[monster.front.rank] ?? String(monster.front.rank)
  return `${rank} of ${suitName(monster.front.suit)}`
}

export function isActiveTarget(state: GameState, row: number, col: number): boolean {
  return state.dungeonGrid[row]?.[col]?.faceUp === true
}

/**
 * Returns true if any cell has POWER_SLOTS cards placed with insufficient
 * power to ever trigger — ending the turn would lock those cards permanently,
 * making the cell unwinnable. Used to disable the End Turn button.
 */
export function hasInsufficientAttack(state: GameState): boolean {
  return state.dungeonGrid.some((gridRow, r) =>
    gridRow.some((cell, c) => {
      if (!cell?.faceUp) return false
      const attack = state.attacks[r]?.[c]
      if (!attack || attack.length < POWER_SLOTS) return false
      return powerSum(attack, state.settings) < monsterLevel(cell)
    })
  )
}

// --- Internal immutable array utilities -------------------------------------

function replaceAt<T>(arr: T[], index: number, value: T): T[] {
  const next = arr.slice()
  next[index] = value
  return next
}

function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index)
}

function faceUp(card: CardData): CardData {
  return card.faceUp ? card : { ...card, faceUp: true }
}

function replaceCell<T>(grid: T[][], r: number, c: number, value: T): T[][] {
  return grid.map((row, ri) => ri === r ? replaceAt(row, c, value) : row)
}

function dealDungeon(
  monsters: CardData[],
  rowWidths: number[],
  extraCovers: ExtraCover[] = [],
): { grid: (CardData | null)[][]; coverableBy: number[][][] } {
  let idx = 0
  const grid: (CardData | null)[][] = rowWidths.map(w =>
    Array.from({ length: w }, (): CardData => ({ ...monsters[idx++], faceUp: false }))
  )
  const coverableBy = buildCoverableBy(rowWidths, extraCovers)
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!isCoveredBy(coverableBy, grid, r, c)) {
        grid[r][c] = { ...(grid[r][c] as CardData), faceUp: true }
      }
    }
  }
  return { grid, coverableBy }
}

// --- Reducer ----------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DEBUG_SET_STATE':
      return action.state

    case 'BACK_TO_MENU':
      return initialState

    case 'NEW_GAME': {
      const settings = action.settings ?? defaultSettings
      const layout = getLayout(settings.layout)
      const { monsters, power } = separateDecks(createFullDeck(settings.cardBack))
      const { grid: dungeonGrid, coverableBy } = dealDungeon(shuffle(monsters), layout.rows, layout.extraCovers)
      const emptyAttacks: (CardData[] | null)[][] = layout.rows.map(w =>
        Array.from({ length: w }, () => [] as CardData[])
      )
      const emptyLocked: (number | null)[][] = layout.rows.map(w =>
        Array.from({ length: w }, () => 0)
      )
      const shuffledPower = shuffle(power)
      const SELECTION_SIZE = HAND_SIZE + 2
      if (settings.powerReserve) {
        const selectionPool = shuffledPower.slice(0, SELECTION_SIZE).map(faceUp)
        const powerDeck = shuffledPower.slice(SELECTION_SIZE)
        return {
          phase: 'reserve-selection',
          dungeonGrid,
          coverableBy,
          attacks: emptyAttacks,
          lockedCount: emptyLocked,
          powerDeck,
          hand: [],
          selectedHandIndex: null,
          reserve: [],
          selectedReserveIndex: null,
          damagePile: [],
          clearPile: [],
          message: null,
          score: null,
          settings,
          inventory: [],
          pendingKingAbility: null,
          selectionPool,
        }
      }

      const hand = shuffledPower.slice(0, HAND_SIZE).map(faceUp)
      const powerDeck = shuffledPower.slice(HAND_SIZE)
      return {
        phase: 'playing',
        dungeonGrid,
        coverableBy,
        attacks: emptyAttacks,
        lockedCount: emptyLocked,
        powerDeck,
        hand,
        selectedHandIndex: null,
        reserve: [],
        selectedReserveIndex: null,
        damagePile: [],
        clearPile: [],
        message: null,
        score: null,
        settings,
        inventory: [],
        pendingKingAbility: null,
        selectionPool: [],
      }
    }

    case 'SELECT_HAND': {
      if (state.phase !== 'playing') return state
      if (action.index < 0 || action.index >= state.hand.length) return state
      const selectedHandIndex =
        state.selectedHandIndex === action.index ? null : action.index
      return { ...state, selectedHandIndex, selectedReserveIndex: null, message: null }
    }

    case 'SELECT_RESERVE': {
      if (state.phase !== 'playing') return state
      if (action.index < 0 || action.index >= state.reserve.length) return state
      const selectedReserveIndex =
        state.selectedReserveIndex === action.index ? null : action.index
      return { ...state, selectedReserveIndex, selectedHandIndex: null, message: null }
    }

    case 'PLACE_CARD': {
      if (state.phase !== 'playing') return state
      if (state.selectedHandIndex === null && state.selectedReserveIndex === null) {
        return { ...state, message: 'Select a card from your hand first.' }
      }

      const { row, col } = action
      const cellMonster = state.dungeonGrid[row]?.[col]
      if (!cellMonster?.faceUp) return { ...state, message: 'No monster to attack there.' }

      let card: CardData
      let handAfter: CardData[]
      let reserveAfter: CardData[]
      if (state.selectedHandIndex !== null) {
        card = faceUp(state.hand[state.selectedHandIndex])
        handAfter = removeAt(state.hand, state.selectedHandIndex)
        reserveAfter = state.reserve
      } else {
        card = faceUp(state.reserve[state.selectedReserveIndex!])
        handAfter = state.hand
        reserveAfter = removeAt(state.reserve, state.selectedReserveIndex!)
      }

      const attack = state.attacks[row]?.[col] ?? []
      const error = placementError(state, card, row, col)
      if (error) return { ...state, message: error }

      // Power slot: append and keep playing.
      if (attack.length < POWER_SLOTS) {
        return {
          ...state,
          attacks: replaceCell(state.attacks, row, col, [...attack, card]),
          hand: handAfter,
          reserve: reserveAfter,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          message: null,
        }
      }

      // Trigger slot: monster defeated.
      const monster = cellMonster
      const aceReturns = state.settings.boomersAce && !card.front.joker && card.front.rank === 1
      const kingToInventory = state.settings.kingAbilities && monster.front.rank === 13
      const triggerCards = aceReturns ? [] : [card]
      const monsterCards = kingToInventory ? [] : [faceUp(monster)]
      const defeatedCards = [...attack, ...triggerCards, ...monsterCards]
      const handAfterTrigger = aceReturns ? [...handAfter, card] : handAfter
      const inventoryAfter = kingToInventory ? [...state.inventory, faceUp(monster)] : state.inventory

      // Null out the defeated cell.
      let newGrid = replaceCell(state.dungeonGrid, row, col, null)
      let newAttacks = replaceCell(state.attacks, row, col, null)
      const newLocked = replaceCell(state.lockedCount, row, col, null)

      // Reveal any cells in the row above that are now uncovered.
      if (row > 0) {
        for (let c = 0; c < newGrid[row - 1].length; c++) {
          const above = newGrid[row - 1][c]
          if (above !== null && !above.faceUp && !isCoveredBy(state.coverableBy, newGrid, row - 1, c)) {
            newGrid = replaceCell(newGrid, row - 1, c, { ...above, faceUp: true })
          }
        }
      }

      const clearPile = [...state.clearPile, ...defeatedCards]
      const won = newGrid.every(r => r.every(c => c === null))

      if (won) {
        return {
          ...state,
          dungeonGrid: newGrid,
          attacks: newAttacks,
          lockedCount: newLocked,
          hand: handAfterTrigger,
          reserve: reserveAfter,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          clearPile,
          inventory: inventoryAfter,
          pendingKingAbility: null,
          phase: 'won',
          score: state.powerDeck.length,
          message: `You cleared the dungeon! Score: ${state.powerDeck.length}.`,
        }
      }

      // Auto-draw when the hand is exhausted on the defeating card.
      if (handAfterTrigger.length === 0) {
        const lockedCount: (number | null)[][] = newAttacks.map(r =>
          r.map(cell => cell !== null ? cell.length : null)
        )
        const hand = state.powerDeck.slice(0, HAND_SIZE).map(faceUp)
        const powerDeck = state.powerDeck.slice(HAND_SIZE)
        if (hand.length === 0) {
          return {
            ...state,
            dungeonGrid: newGrid,
            attacks: newAttacks,
            lockedCount,
            hand: [],
            reserve: reserveAfter,
            powerDeck,
            selectedHandIndex: null,
            selectedReserveIndex: null,
            clearPile,
            inventory: inventoryAfter,
            pendingKingAbility: null,
            phase: 'lost',
            message: 'Out of power cards. You lost.',
          }
        }
        return {
          ...state,
          dungeonGrid: newGrid,
          attacks: newAttacks,
          lockedCount,
          hand,
          reserve: reserveAfter,
          powerDeck,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          clearPile,
          inventory: inventoryAfter,
          pendingKingAbility: null,
          phase: 'playing',
          score: null,
          message: `${monsterName(monster)} defeated!`,
        }
      }

      return {
        ...state,
        dungeonGrid: newGrid,
        attacks: newAttacks,
        lockedCount: newLocked,
        hand: handAfterTrigger,
        reserve: reserveAfter,
        selectedHandIndex: null,
        selectedReserveIndex: null,
        clearPile,
        inventory: inventoryAfter,
        pendingKingAbility: null,
        phase: 'playing',
        score: null,
        message: `${monsterName(monster)} defeated!`,
      }
    }

    case 'RECALL_CARD': {
      if (state.phase !== 'playing') return state
      const { row, col, slotIndex } = action
      const attack = state.attacks[row]?.[col]
      if (!attack || slotIndex < 0 || slotIndex >= attack.length) return state
      const locked = state.lockedCount[row]?.[col] ?? 0
      if (slotIndex < locked) {
        return { ...state, message: 'That card is locked in from a previous turn.' }
      }
      const raw = faceUp(attack[slotIndex])
      const card: CardData = raw.front.boosted
        ? { ...raw, front: { ...raw.front, boosted: undefined } }
        : raw
      return {
        ...state,
        attacks: replaceCell(state.attacks, row, col, removeAt(attack, slotIndex)),
        hand: [...state.hand, card],
        selectedHandIndex: null,
        message: null,
      }
    }

    case 'END_TURN': {
      if (state.phase !== 'playing') return state

      const damagePile = [...state.damagePile, ...state.hand.map(faceUp)]
      if (damagePile.length >= MAX_DAMAGE) {
        return {
          ...state,
          hand: [],
          damagePile,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          phase: 'lost',
          message: `Damage bar reached ${damagePile.length}. You lost.`,
        }
      }

      const lockedCount: (number | null)[][] = state.attacks.map(r =>
        r.map(cell => cell !== null ? cell.length : null)
      )

      const hand = state.powerDeck.slice(0, HAND_SIZE).map(faceUp)
      const powerDeck = state.powerDeck.slice(HAND_SIZE)

      if (hand.length === 0) {
        return {
          ...state,
          hand: [],
          powerDeck,
          damagePile,
          lockedCount,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          phase: 'lost',
          message: 'Out of power cards. You lost.',
        }
      }

      return {
        ...state,
        hand,
        powerDeck,
        damagePile,
        lockedCount,
        selectedHandIndex: null,
        selectedReserveIndex: null,
        message: null,
      }
    }

    case 'ACTIVATE_KING': {
      if (state.phase !== 'playing') return state
      const { kingCard } = action

      if (state.pendingKingAbility === kingCard) {
        return { ...state, pendingKingAbility: null, message: null }
      }

      const remainingInventory = state.inventory.filter(k => k !== kingCard)
      const suit = kingCard.front.suit

      if (suit === 0) {
        if (state.powerDeck.length === 0) return { ...state, message: 'No cards left to draw.' }
        return {
          ...state,
          hand: [...state.hand, faceUp(state.powerDeck[0])],
          powerDeck: state.powerDeck.slice(1),
          inventory: remainingInventory,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          pendingKingAbility: null,
          message: null,
        }
      }

      if (suit === 1) {
        if (state.powerDeck.length === 0) return { ...state, message: 'No cards left to peek.' }
        return {
          ...state,
          pendingKingAbility: kingCard,
          selectedHandIndex: null,
          selectedReserveIndex: null,
          message: null,
        }
      }

      return {
        ...state,
        pendingKingAbility: kingCard,
        selectedHandIndex: null,
        selectedReserveIndex: null,
        message: suit === 2
          ? 'Select a hand card to put on the bottom of the deck.'
          : 'Select an attack card to double its power.',
      }
    }

    case 'CANCEL_KING_ABILITY':
      return { ...state, pendingKingAbility: null, message: null }

    case 'USE_KING_DIAMONDS': {
      if (state.phase !== 'playing' || !state.pendingKingAbility) return state
      const kingCard = state.pendingKingAbility
      const deck = state.powerDeck
      if (deck.length === 0) return { ...state, pendingKingAbility: null, message: null }
      const bottom = deck[deck.length - 1]
      const newDeck = action.choice === 'take'
        ? [faceUp(bottom), ...deck.slice(0, -1)]
        : deck
      return {
        ...state,
        powerDeck: newDeck,
        inventory: state.inventory.filter(k => k !== kingCard),
        pendingKingAbility: null,
        message: null,
      }
    }

    case 'USE_KING_HEARTS': {
      if (state.phase !== 'playing' || !state.pendingKingAbility) return state
      const { handIndex } = action
      if (handIndex < 0 || handIndex >= state.hand.length) return state
      const buried = faceUp(state.hand[handIndex])
      const kingCard = state.pendingKingAbility
      return {
        ...state,
        hand: removeAt(state.hand, handIndex),
        powerDeck: [...state.powerDeck, buried],
        inventory: state.inventory.filter(k => k !== kingCard),
        pendingKingAbility: null,
        selectedHandIndex: null,
        message: null,
      }
    }

    case 'USE_KING_SPADES': {
      if (state.phase !== 'playing' || !state.pendingKingAbility) return state
      const { row, col, slotIndex } = action
      const attack = state.attacks[row]?.[col]
      if (!attack || slotIndex < 0 || slotIndex >= attack.length) return state
      const target = attack[slotIndex]
      const boosted: CardData = { ...target, front: { ...target.front, boosted: true } }
      const kingCard = state.pendingKingAbility
      return {
        ...state,
        attacks: replaceCell(state.attacks, row, col, replaceAt(attack, slotIndex, boosted)),
        inventory: state.inventory.filter(k => k !== kingCard),
        pendingKingAbility: null,
        message: null,
      }
    }

    case 'CONFIRM_RESERVE': {
      if (state.phase !== 'reserve-selection') return state
      const [i, j] = action.reserveIndices
      const reserve = [state.selectionPool[i], state.selectionPool[j]]
      const hand = state.selectionPool.filter((_, idx) => idx !== i && idx !== j)
      return {
        ...state,
        phase: 'playing',
        hand,
        reserve,
        selectionPool: [],
      }
    }

    default:
      return state
  }
}
