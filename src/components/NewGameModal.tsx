import { useState } from 'react'
import { defaultSettings, type GameSettings } from '../game/state'
import { LAYOUTS, type LayoutKey } from '../game/layouts'
import './NewGameModal.css'

interface NewGameModalProps {
  onStart: (settings: GameSettings) => void
  onCancel: () => void
}

type BooleanSettingKey = 'boomersAce' | 'powerReserve' | 'kingAbilities'

const SETTINGS_CONFIG: { key: BooleanSettingKey; label: string; desc: string }[] = [
  { key: 'boomersAce',    label: 'Boomer Ace',     desc: 'Aces worth 11; a trigger Ace returns to your hand' },
  { key: 'powerReserve',  label: 'Power Reserve',  desc: 'Draw 5 on turn 1, set 2 aside as always-available cards' },
  { key: 'kingAbilities', label: 'King Abilities', desc: 'Defeated Kings grant one-shot powers' },
]

export function NewGameModal({ onStart, onCancel }: NewGameModalProps) {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings)

  function toggle(key: BooleanSettingKey) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  function setLayout(key: LayoutKey) {
    setSettings(s => ({ ...s, layout: key }))
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

        <div className="new-game-modal__layout-section">
          <div className="new-game-modal__section-label">Dungeon Layout</div>
          <div className="new-game-modal__layout-tiles">
            {LAYOUTS.map(({ key, name, rows }) => {
              const selected = settings.layout === key
              return (
                <button
                  key={key}
                  className={`new-game-modal__layout-tile${selected ? ' new-game-modal__layout-tile--selected' : ''}`}
                  onClick={() => setLayout(key)}
                >
                  <div className="new-game-modal__layout-preview">
                    {rows.map((width, rowIdx) => (
                      <div key={rowIdx} className="new-game-modal__layout-preview-row">
                        {Array.from({ length: width }).map((_, i) => (
                          <div key={i} className="new-game-modal__layout-preview-cell" />
                        ))}
                      </div>
                    ))}
                  </div>
                  <span className="new-game-modal__layout-name">{name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="new-game-modal__actions">
          <button className="new-game-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="new-game-modal__btn--start" onClick={() => onStart(settings)}>Start Game</button>
        </div>
      </div>
    </div>
  )
}
