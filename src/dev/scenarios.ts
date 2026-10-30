import type { CardData } from '../components/Card'
import type { GameState } from '../game/state'
import { initialState } from '../game/state'

function power(rank: number, suit: number): CardData {
  return { faceUp: false, front: { rank, suit }, back: { color: 'Blue', version: 1 } }
}

function played(rank: number, suit: number): CardData {
  return { faceUp: true, front: { rank, suit }, back: { color: 'Blue', version: 1 } }
}

function monster(rank: number, suit: number): CardData {
  return { faceUp: true, front: { rank, suit }, back: { color: 'Red', version: 1 } }
}

const FILLER_DECK: CardData[] = [
  power(2, 0), power(3, 1), power(4, 2), power(5, 3),
  power(6, 0), power(7, 1), power(8, 2), power(9, 3),
  power(10, 0), power(2, 1), power(3, 2), power(4, 3),
]

/**
 * Boomer-Ace scenario:
 * - Jack of Clubs (level 11) has two power cards totalling 12 locked on it
 * - Ace of Clubs is first in hand — with boomersAce it counts as 11, making it
 *   a valid trigger that returns to hand after killing the Jack
 *
 * Grid: single row of 4 cells. J♣ is at col 0 with attacks; others active.
 */
export function boomersAceScenario(): GameState {
  return {
    ...initialState,
    phase: 'playing',
    settings: { boomersAce: true, powerReserve: false, kingAbilities: false, layout: 'standard' as const },
    dungeonGrid: [[
      monster(11, 0),   // Jack of Clubs — active, attack-ready
      monster(11, 1),   // Jack of Diamonds
      monster(11, 2),   // Jack of Hearts
      monster(11, 3),   // Jack of Spades
    ]],
    attacks: [[
      [played(6, 1), played(6, 2)],  // 6♦ + 6♥ = 12 ≥ 11 ✓ — trigger-ready
      [],
      [],
      [],
    ]],
    lockedCount: [[2, 0, 0, 0]],  // both power cards locked from last turn
    hand: [played(1, 0), played(7, 2), played(5, 3)],  // A♣ at index 0 is the trigger
    powerDeck: FILLER_DECK,
    message: "Boomer-Ace: play the A♣ onto the Jack of Clubs — it triggers and returns to hand!",
  }
}

/**
 * King abilities scenario:
 * - All four Kings already in inventory (defeated and ready to use)
 * - Monsters still on the board so no accidental win
 * - One attack card placed on J♣ for K♠ (double) to act on
 * - Power deck is face-down and full enough to test K♣/K♦
 *
 * Grid: single row of 4 cells. J♣ has a partial attack; others active.
 */
export function kingAbilitiesScenario(): GameState {
  const allKings: CardData[] = [
    { faceUp: true, front: { rank: 13, suit: 0 }, back: { color: 'Red', version: 1 } }, // K♣ draw top
    { faceUp: true, front: { rank: 13, suit: 1 }, back: { color: 'Red', version: 1 } }, // K♦ peek bottom
    { faceUp: true, front: { rank: 13, suit: 2 }, back: { color: 'Red', version: 1 } }, // K♥ bury hand card
    { faceUp: true, front: { rank: 13, suit: 3 }, back: { color: 'Red', version: 1 } }, // K♠ double attack card
  ]
  return {
    ...initialState,
    phase: 'playing',
    settings: { boomersAce: false, powerReserve: false, kingAbilities: true, layout: 'standard' as const },
    dungeonGrid: [[
      monster(11, 0),  // Jack of Clubs
      monster(12, 1),  // Queen of Diamonds
      monster(11, 2),  // Jack of Hearts
      monster(11, 3),  // Jack of Spades
    ]],
    attacks: [[
      [played(3, 0)],  // 3♣ placed — K♠ can double it to 6
      [],
      [],
      [],
    ]],
    lockedCount: [[0, 0, 0, 0]],
    hand: [played(5, 1), played(7, 2), played(8, 3)],
    powerDeck: FILLER_DECK,
    inventory: allKings,
    message: "King abilities: K♣ draws top, K♦ peeks bottom, K♥ buries a hand card, K♠ doubles an attack card!",
  }
}
