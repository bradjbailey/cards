import Card, { type CardData } from './Card'
import './DiscardOverlay.css'

interface DiscardOverlayProps {
  cards: CardData[]
  onBack: () => void
  title: string
}

export function DiscardOverlay({ cards, onBack, title }: DiscardOverlayProps) {
  return (
    <div className="discard-overlay">
      <div className="discard-overlay__header">
        <button className="discard-overlay__back" onClick={onBack}>← Back</button>
        <h2 className="discard-overlay__title">{title} ({cards.length})</h2>
      </div>
      {cards.length === 0 ? (
        <p className="discard-overlay__empty">Nothing discarded yet.</p>
      ) : (
        <div className="discard-overlay__grid">
          {cards.map((card, index) => (
            <div key={index} className="discard-overlay__card">
              <Card {...card} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
