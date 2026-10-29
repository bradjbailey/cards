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

export interface CardProps extends CardData {
  onClick?: () => void
  selected?: boolean
  highlight?: boolean
  dimmed?: boolean
}

const suitMap: Record<number, string> = {
  0: 'Clubs',
  1: 'Diamonds',
  2: 'Hearts',
  3: 'Spades',
}

const rankMap: Record<number, string> = {
  0: 'Joker', 1: 'Ace', 2: '2', 3: '3', 4: '4', 5: '5',
  6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'Jack', 12: 'Queen', 13: 'King',
}

export function Card({ faceUp, front, back, onClick, selected, highlight, dimmed }: CardProps) {
  const frontImage = getCardFrontImagePath(front.rank, front.suit, front.joker)
  const backImage = getCardBackImagePath(back.color, back.version)

  const altText = front.joker
    ? 'Joker'
    : faceUp
    ? `${rankMap[front.rank] ?? front.rank} of ${suitMap[front.suit] ?? front.suit}`
    : 'Card back'

  const classes = [
    'card',
    onClick ? 'card--clickable' : '',
    selected ? 'card--selected' : '',
    highlight ? 'card--highlight' : '',
    dimmed ? 'card--dimmed' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      } : undefined}
    >
      {faceUp ? (
        <img src={frontImage} alt={altText} />
      ) : (
        <img src={backImage} alt={altText} />
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