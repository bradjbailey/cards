import type { CardData } from '../components/Card'
import { createFullDeck, shuffle, separateDecks } from './deck'

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

export type GamePhase = 'idle' | 'playing' | 'won' | 'lost'

export interface GameSettings {
  boomersAce: boolean
  powerReserve: boolean
  kingAbilities: boolean
}

export const defaultSettings: GameSettings = {
  boomersAce: false,
  powerReserve: false,
  kingAbilities: false,
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
   * Four columns of monster cards. The LAST element of each column is the
   * currently revealed (face-up) monster; earlier elements are face-down and
   * revealed as the column is cleared. An empty column is a fully cleared one.
   */
  dungeonColumns: CardData[][]
  /**
   * In-progress attack cards for each column's active monster. Slots 0..1 are
   * power cards; slot 2 is the trigger (but a completed trigger defeats the
   * monster immediately, so an *active* monster never actually holds 3).
   */
  attacks: CardData[][]
  /**
   * Per column, how many attack cards are locked from previous turns. Cards at
   * an index < lockedCount cannot be recalled; cards placed this turn can.
   */
  lockedCount: number[]
  powerDeck: CardData[]
  hand: CardData[]
  /** Index into `hand` of the currently selected card, or null. */
  selectedHandIndex: number | null
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
}

export const initialState: GameState = {
  phase: 'idle',
  dungeonColumns: [[], [], [], []],
  attacks: [[], [], [], []],
  lockedCount: [0, 0, 0, 0],
  powerDeck: [],
  hand: [],
  selectedHandIndex: null,
  damagePile: [],
  clearPile: [],
  message: null,
  score: null,
  settings: defaultSettings,
  inventory: [],
}

export type GameAction =
  | { type: 'NEW_GAME'; settings?: GameSettings }
  | { type: 'BACK_TO_MENU' }
  | { type: 'SELECT_HAND'; index: number }
  | { type: 'PLACE_CARD'; columnIndex: number }
  | { type: 'RECALL_CARD'; columnIndex: number; slotIndex: number }
  | { type: 'END_TURN' }

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

/** Attack value of a power card: Jokers are 10, everything else is its rank. */
export function cardPower(card: CardData): number {
  return card.front.joker ? 10 : card.front.rank
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
export function powerSum(attack: CardData[]): number {
  return attack.slice(0, POWER_SLOTS).reduce((sum, c) => sum + cardPower(c), 0)
}

/** The revealed monster for a column, or null if the column is cleared. */
export function activeMonster(column: CardData[]): CardData | null {
  return column.length > 0 ? column[column.length - 1] : null
}

/**
 * Whether placing `card` on `columnIndex` is a legal move right now. Returns a
 * reason string when illegal (suitable for display), or null when legal.
 */
export function placementError(
  state: GameState,
  card: CardData,
  columnIndex: number,
): string | null {
  const column = state.dungeonColumns[columnIndex]
  const monster = column ? activeMonster(column) : null
  if (!monster) return 'No monster to attack there.'

  const attack = state.attacks[columnIndex]
  // Still filling power slots: any card is a legal power card.
  if (attack.length < POWER_SLOTS) return null

  // Trigger slot: power must be high enough and the suit must match.
  const level = monsterLevel(monster)
  const sum = powerSum(attack)
  if (sum < level) {
    return `Power is ${sum}; needs ${level}+. Recall a power card and use a higher one.`
  }
  if (!isValidTrigger(card, monster)) {
    return `Trigger must be ${suitName(monster.front.suit)} (or a Joker).`
  }
  return null
}

export function monsterName(monster: CardData): string {
  const rank = FACE_NAMES[monster.front.rank] ?? String(monster.front.rank)
  return `${rank} of ${suitName(monster.front.suit)}`
}

export function isActiveTarget(state: GameState, columnIndex: number): boolean {
  return activeMonster(state.dungeonColumns[columnIndex]) !== null
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

function dealDungeon(monsters: CardData[]): CardData[][] {
  // 4 columns x 3 cards; the last card in each column is revealed face up.
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

// --- Reducer ----------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BACK_TO_MENU':
      return initialState

    case 'NEW_GAME': {
      const settings = action.settings ?? defaultSettings
      const { monsters, power } = separateDecks(createFullDeck())
      const dungeonColumns = dealDungeon(shuffle(monsters))
      const shuffledPower = shuffle(power)
      const hand = shuffledPower.slice(0, HAND_SIZE).map(faceUp)
      const powerDeck = shuffledPower.slice(HAND_SIZE)
      return {
        phase: 'playing',
        dungeonColumns,
        attacks: [[], [], [], []],
        lockedCount: [0, 0, 0, 0],
        powerDeck,
        hand,
        selectedHandIndex: null,
        damagePile: [],
        clearPile: [],
        message: null,
        score: null,
        settings,
        inventory: [],
      }
    }

    case 'SELECT_HAND': {
      if (state.phase !== 'playing') return state
      if (action.index < 0 || action.index >= state.hand.length) return state
      const selectedHandIndex =
        state.selectedHandIndex === action.index ? null : action.index
      return { ...state, selectedHandIndex, message: null }
    }

    case 'PLACE_CARD': {
      if (state.phase !== 'playing') return state
      if (state.selectedHandIndex === null) {
        return { ...state, message: 'Select a card from your hand first.' }
      }

      const { columnIndex } = action
      const column = state.dungeonColumns[columnIndex]
      const monster = column ? activeMonster(column) : null
      if (!monster) return { ...state, message: 'No monster to attack there.' }

      const card = faceUp(state.hand[state.selectedHandIndex])
      const attack = state.attacks[columnIndex]
      const error = placementError(state, card, columnIndex)
      if (error) return { ...state, message: error }

      const handAfter = removeAt(state.hand, state.selectedHandIndex)

      // Power slot: append and keep playing.
      if (attack.length < POWER_SLOTS) {
        return {
          ...state,
          attacks: replaceAt(state.attacks, columnIndex, [...attack, card]),
          hand: handAfter,
          selectedHandIndex: null,
          message: null,
        }
      }

      // Trigger slot: the monster is defeated. Move it and its attack cards to
      // the clear pile, reveal the next monster, and check for a win.
      const defeatedCards = [...attack, card, faceUp(monster)]
      const columnAfter = column.slice(0, -1)
      if (columnAfter.length > 0) {
        const top = columnAfter.length - 1
        columnAfter[top] = { ...columnAfter[top], faceUp: true }
      }
      const dungeonColumns = replaceAt(state.dungeonColumns, columnIndex, columnAfter)
      const won = dungeonColumns.every((c) => c.length === 0)
      const updatedAttacks = replaceAt(state.attacks, columnIndex, [])
      const clearPile = [...state.clearPile, ...defeatedCards]

      if (won) {
        return {
          ...state,
          dungeonColumns,
          attacks: updatedAttacks,
          lockedCount: replaceAt(state.lockedCount, columnIndex, 0),
          hand: handAfter,
          selectedHandIndex: null,
          clearPile,
          phase: 'won',
          score: state.powerDeck.length,
          message: `You cleared the dungeon! Score: ${state.powerDeck.length}.`,
        }
      }

      // Auto-draw when the hand is exhausted on the defeating card: lock all
      // remaining partial attacks (new turn starts) and draw a fresh hand.
      if (handAfter.length === 0) {
        const lockedCount = updatedAttacks.map((a) => a.length)
        const hand = state.powerDeck.slice(0, HAND_SIZE).map(faceUp)
        const powerDeck = state.powerDeck.slice(HAND_SIZE)
        if (hand.length === 0) {
          return {
            ...state,
            dungeonColumns,
            attacks: updatedAttacks,
            lockedCount,
            hand: [],
            powerDeck,
            selectedHandIndex: null,
            clearPile,
            phase: 'lost',
            message: 'Out of power cards. You lost.',
          }
        }
        return {
          ...state,
          dungeonColumns,
          attacks: updatedAttacks,
          lockedCount,
          hand,
          powerDeck,
          selectedHandIndex: null,
          clearPile,
          phase: 'playing',
          score: null,
          message: `${monsterName(monster)} defeated!`,
        }
      }

      return {
        ...state,
        dungeonColumns,
        attacks: updatedAttacks,
        lockedCount: replaceAt(state.lockedCount, columnIndex, 0),
        hand: handAfter,
        selectedHandIndex: null,
        clearPile,
        phase: 'playing',
        score: null,
        message: `${monsterName(monster)} defeated!`,
      }
    }

    case 'RECALL_CARD': {
      if (state.phase !== 'playing') return state
      const { columnIndex, slotIndex } = action
      const attack = state.attacks[columnIndex]
      if (!attack || slotIndex < 0 || slotIndex >= attack.length) return state
      if (slotIndex < state.lockedCount[columnIndex]) {
        return { ...state, message: 'That card is locked in from a previous turn.' }
      }
      const card = faceUp(attack[slotIndex])
      return {
        ...state,
        attacks: replaceAt(state.attacks, columnIndex, removeAt(attack, slotIndex)),
        hand: [...state.hand, card],
        selectedHandIndex: null,
        message: null,
      }
    }

    case 'END_TURN': {
      if (state.phase !== 'playing') return state

      // Discard whatever is left in hand to the damage bar.
      const damagePile = [...state.damagePile, ...state.hand.map(faceUp)]
      if (damagePile.length >= MAX_DAMAGE) {
        return {
          ...state,
          hand: [],
          damagePile,
          selectedHandIndex: null,
          phase: 'lost',
          message: `Damage bar reached ${damagePile.length}. You lost.`,
        }
      }

      // Partial attacks become permanent at the turn boundary.
      const lockedCount = state.attacks.map((a) => a.length)

      // Draw the next hand (up to HAND_SIZE; may be a short final hand).
      const hand = state.powerDeck.slice(0, HAND_SIZE).map(faceUp)
      const powerDeck = state.powerDeck.slice(HAND_SIZE)

      if (hand.length === 0) {
        // No cards left to draw and monsters remain (a win would have ended the
        // game already), so the dungeon can never be cleared.
        return {
          ...state,
          hand: [],
          powerDeck,
          damagePile,
          lockedCount,
          selectedHandIndex: null,
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
        message: null,
      }
    }

    default:
      return state
  }
}
