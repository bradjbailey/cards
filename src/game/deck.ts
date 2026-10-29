import type { CardData } from '../components/Card'

const defaultBack = { color: 'Blue' as const, version: 1 as const }

export function createFullDeck(): CardData[] {
  const cards: CardData[] = []
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ faceUp: false, front: { rank, suit }, back: defaultBack })
    }
  }
  // Two jokers: suit 0 → black, suit 2 → red
  cards.push({ faceUp: false, front: { rank: 0, suit: 0, joker: true }, back: defaultBack })
  cards.push({ faceUp: false, front: { rank: 0, suit: 2, joker: true }, back: defaultBack })
  return cards
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function separateDecks(full: CardData[]): { monsters: CardData[]; power: CardData[] } {
  const monsters = full.filter(c => c.front.rank >= 11 && !c.front.joker)
  const power = full.filter(c => c.front.rank < 11 || c.front.joker)
  return { monsters, power }
}
