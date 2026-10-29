import Card from './Card'
import type { CardData } from './Card'
import './CardPeek.css'

interface CardPeekProps {
  card: CardData
  title: string
  instruction: string
  confirmLabel?: string
  dismissLabel?: string
  onConfirm: () => void
  onDismiss: () => void
}

export function CardPeek({
  card,
  title,
  instruction,
  confirmLabel = 'Take',
  dismissLabel = 'Leave',
  onConfirm,
  onDismiss,
}: CardPeekProps) {
  return (
    <div className="card-peek">
      <div className="card-peek__inner">
        <h2 className="card-peek__title">{title}</h2>
        <p className="card-peek__instruction">{instruction}</p>
        <div className="card-peek__card">
          <Card {...card} faceUp={true} />
        </div>
        <div className="card-peek__actions">
          <button className="card-peek__btn card-peek__btn--dismiss" onClick={onDismiss}>
            {dismissLabel}
          </button>
          <button className="card-peek__btn card-peek__btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
