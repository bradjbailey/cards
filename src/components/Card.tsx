import { playingCardAssets } from '../assets/PlayingCards'
import './Card.css'

export interface FrontOfCard {
  rank: number
  suit: number
  joker?: true
}

export type BackCardColor = 'Blue' | 'Grey' | 'Red'
export type BackCardVersion = 1 | 2

export interface BackOfCard {
  color: BackCardColor
  version: BackCardVersion
}

export interface CardData {
  faceUp: boolean
  front: FrontOfCard
  back: BackOfCard
}

export interface CardProps extends CardData {}

const suitMap: Record<number, string> = {
  0: 'Clubs',
  1: 'Diamonds',
  2: 'Hearts',
  3: 'Spades',
}

export function Card({ faceUp, front, back }: CardProps) {
  const frontImage = getCardFrontImagePath(front.rank, front.suit, front.joker)
  const backImage = getCardBackImagePath(back.color, back.version)

  return (
    <div className="card">
      {faceUp ? (
        <img src={frontImage} alt={`${front.rank} of ${front.suit}`} />
      ) : (
        <img src={backImage} alt="Card back" />
      )}
    </div>
  )
}

export function getNormalizedSuit(suit: number) {
    return suitMap[suit]
}

function getCardFrontImagePath(rank: number, suit: number, joker?: true) {
  if (joker) {
    const color = suit === 0 || suit === 3 ? 'Black' : 'Red'
    return playingCardAssets[`Joker_${color}`]
  }
  const normalizedSuit = getNormalizedSuit(suit)
  const assetKey = `${normalizedSuit}_${rank}`
  return playingCardAssets[assetKey]
}

function getCardBackImagePath(color: BackCardColor, version: BackCardVersion) {
  const assetKey = `Back_${color}_${version}`
  return playingCardAssets[assetKey]
}

export default Card