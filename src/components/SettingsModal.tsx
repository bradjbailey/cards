import Card from './Card'
import type { BackCardColor, BackCardVersion, BackOfCard } from './Card'
import type { ColorSettings, AppSettings } from '../hooks/useAppSettings'
import { DEFAULT_SETTINGS } from '../hooks/useAppSettings'
import './SettingsModal.css'

interface SettingsModalProps {
  settings: AppSettings
  onUpdateColors: (patch: Partial<ColorSettings>) => void
  onUpdateCardBack: (back: BackOfCard) => void
  onResetColors: () => void
  onClose: () => void
}

const BACK_COLORS: BackCardColor[] = ['Blue', 'Grey', 'Red']
const BACK_VERSIONS: BackCardVersion[] = [1, 2]

export function SettingsModal({ settings, onUpdateColors, onUpdateCardBack, onResetColors, onClose }: SettingsModalProps) {
  const { colors, cardBack } = settings

  return (
    <div className="settings-modal__overlay" onClick={onClose}>
      <div className="settings-modal__box" onClick={e => e.stopPropagation()}>
        <h2 className="settings-modal__title">Settings</h2>

        {/* ── Appearance ─────────────────────────────────── */}
        <div className="settings-modal__section">
          <div className="settings-modal__section-label">Appearance</div>

          <div className="settings-modal__color-rows">
            {([
              { key: 'bg',        label: 'Background' },
              { key: 'primary',   label: 'Primary' },
              { key: 'secondary', label: 'Secondary' },
            ] as { key: keyof ColorSettings; label: string }[]).map(({ key, label }) => (
              <label key={key} className="settings-modal__color-row">
                <span className="settings-modal__color-label">{label}</span>
                <div className="settings-modal__color-right">
                  <span className="settings-modal__color-hex">{colors[key]}</span>
                  <input
                    type="color"
                    className="settings-modal__color-input"
                    value={colors[key]}
                    onChange={e => onUpdateColors({ [key]: e.target.value })}
                  />
                </div>
              </label>
            ))}
          </div>

          <button className="settings-modal__reset" onClick={onResetColors}>
            Reset to defaults
          </button>
        </div>

        {/* ── Card Back ──────────────────────────────────── */}
        <div className="settings-modal__section">
          <div className="settings-modal__section-label">Card Deck</div>

          <div className="settings-modal__deck-row">
            <div className="settings-modal__deck-group">
              <div className="settings-modal__deck-group-label">Color</div>
              <div className="settings-modal__deck-options">
                {BACK_COLORS.map(color => (
                  <button
                    key={color}
                    className={`settings-modal__deck-option${cardBack.color === color ? ' settings-modal__deck-option--selected' : ''}`}
                    onClick={() => onUpdateCardBack({ ...cardBack, color })}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-modal__deck-group">
              <div className="settings-modal__deck-group-label">Pattern</div>
              <div className="settings-modal__deck-options">
                {BACK_VERSIONS.map(version => (
                  <button
                    key={version}
                    className={`settings-modal__deck-option${cardBack.version === version ? ' settings-modal__deck-option--selected' : ''}`}
                    onClick={() => onUpdateCardBack({ ...cardBack, version })}
                  >
                    {version}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-modal__deck-preview">
              <Card faceUp={false} front={{ rank: 1, suit: 0 }} back={cardBack} />
            </div>
          </div>
          <p className="settings-modal__deck-note">Applies to next new game</p>
        </div>

        <div className="settings-modal__actions">
          <button className="settings-modal__close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// Re-export DEFAULT_SETTINGS so GameBoard can import from a single place if needed
export { DEFAULT_SETTINGS }
