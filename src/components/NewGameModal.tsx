import { useState } from 'react'
import { defaultSettings, type GameSettings } from '../game/state'
import './NewGameModal.css'

interface NewGameModalProps {
  onStart: (settings: GameSettings) => void
  onCancel: () => void
}

const SETTINGS_CONFIG: { key: keyof GameSettings; label: string; desc: string }[] = [
  { key: 'boomersAce', label: 'Boomer Ace', desc: 'Aces worth 11; a trigger Ace returns to your hand' },
  { key: 'powerReserve', label: 'Power Reserve', desc: 'Draw 5 on turn 1, set 2 aside as always-available cards' },
  { key: 'kingAbilities', label: 'King Abilities', desc: 'Defeated Kings grant one-shot powers' },
]

export function NewGameModal({ onStart, onCancel }: NewGameModalProps) {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings)

  function toggle(key: keyof GameSettings) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  return (
    <div className="new-game-modal__overlay">
      <div className="new-game-modal__box">
        <h2 className="new-game-modal__title">New Game</h2>
        <div className="new-game-modal__settings">
          {SETTINGS_CONFIG.map(({ key, label, desc }) => (
            <label key={key} className="new-game-modal__toggle-row">
              <div className="new-game-modal__toggle-text">
                <span className="new-game-modal__toggle-label">{label}</span>
                <span className="new-game-modal__toggle-desc">{desc}</span>
              </div>
              <div
                className={`new-game-modal__toggle${settings[key] ? ' new-game-modal__toggle--on' : ''}`}
                role="switch"
                aria-checked={settings[key]}
                tabIndex={0}
                onClick={() => toggle(key)}
                onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && toggle(key)}
              />
            </label>
          ))}
        </div>
        <div className="new-game-modal__actions">
          <button className="new-game-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="new-game-modal__btn--start" onClick={() => onStart(settings)}>Start Game</button>
        </div>
      </div>
    </div>
  )
}
