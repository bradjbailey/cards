import { useState } from 'react'
import type { Dispatch } from 'react'
import { boomersAceScenario, kingAbilitiesScenario } from '../dev/scenarios'
import type { GameAction } from '../game/state'
import './DevPanel.css'

interface DevPanelProps {
  dispatch: Dispatch<GameAction>
}

const SCENARIOS = [
  { label: 'Boomer-Ace', description: 'A♣ ready to trigger J♣ (power sum 12 locked)', load: boomersAceScenario },
  { label: 'King Abilities', description: 'All 4 kings in inventory, monsters on board', load: kingAbilitiesScenario },
]

export function DevPanel({ dispatch }: DevPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`dev-panel${open ? ' dev-panel--open' : ''}`}>
      <button className="dev-panel__toggle" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '⚙'}
      </button>
      {open && (
        <div className="dev-panel__body">
          <div className="dev-panel__title">Dev Scenarios</div>
          {SCENARIOS.map(({ label, description, load }) => (
            <button
              key={label}
              className="dev-panel__scenario"
              onClick={() => dispatch({ type: 'DEBUG_SET_STATE', state: load() })}
            >
              <span className="dev-panel__scenario-label">{label}</span>
              <span className="dev-panel__scenario-desc">{description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
