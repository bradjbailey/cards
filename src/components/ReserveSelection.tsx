import { useState, useEffect } from 'react'
import type { Dispatch } from 'react'
import Card from './Card'
import type { CardData } from './Card'
import type { GameAction } from '../game/state'
import './ReserveSelection.css'

interface ReserveSelectionProps {
  pool: CardData[]
  dispatch: Dispatch<GameAction>
}

export function ReserveSelection({ pool, dispatch }: ReserveSelectionProps) {
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    if (selected.length === 2) {
      dispatch({ type: 'CONFIRM_RESERVE', reserveIndices: [selected[0], selected[1]] })
    }
  }, [selected, dispatch])

  function toggle(index: number) {
    setSelected(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      if (prev.length >= 2) return prev
      return [...prev, index]
    })
  }

  return (
    <div className="reserve-selection">
      <div className="reserve-selection__inner">
        <h2 className="reserve-selection__title">Power Reserve</h2>
        <p className="reserve-selection__instruction">
          Choose <strong>2 cards</strong> to set aside as your reserve.
          They won't be drawn, but you can play them any turn.
        </p>
        <p className="reserve-selection__count">
          {selected.length === 0 && 'Select 2 cards'}
          {selected.length === 1 && 'Select 1 more'}
          {selected.length === 2 && 'Starting game…'}
        </p>
        <div className="reserve-selection__cards">
          {pool.map((card, index) => {
            const isSelected = selected.includes(index)
            return (
              <div
                key={index}
                className={`reserve-selection__slot${isSelected ? ' reserve-selection__slot--raised' : ''}`}
                onClick={() => toggle(index)}
              >
                <Card {...card} selected={isSelected} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
