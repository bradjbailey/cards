import type { CardData } from './Card'
import { DungeonColumn } from './DungeonColumn'
import './Dungeon.css'

interface DungeonProps {
  columns: CardData[][]
}

export function Dungeon({ columns }: DungeonProps) {
  return (
    <div className="dungeon">
      {columns.map((col, i) => (
        <DungeonColumn key={i} cards={col} />
      ))}
    </div>
  )
}
