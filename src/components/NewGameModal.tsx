import './NewGameModal.css'

interface NewGameModalProps {
  onStart: () => void
  onCancel: () => void
}

export function NewGameModal({ onStart, onCancel }: NewGameModalProps) {
  return (
    <div className="new-game-modal__overlay">
      <div className="new-game-modal__box">
        <h2 className="new-game-modal__title">New Game</h2>
        {/* future settings go here */}
        <div className="new-game-modal__actions">
          <button className="new-game-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="new-game-modal__btn--start" onClick={onStart}>Start Game</button>
        </div>
      </div>
    </div>
  )
}
