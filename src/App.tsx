import { useState, type ChangeEvent } from 'react'
import './App.css'
import { Card, type BackOfCard, type BackCardVersion } from './components/Card'
import { Pile, createPileTestCards } from './components/Pile'
import { Hand } from './components/Hand'

function App() {
  const [rank, setrank] = useState(1)
  const [suit, setSuit] = useState(0)
  const [faceUp, setFaceUp] = useState(false)
  const [back, setBack] = useState<BackOfCard>({ color: 'Blue', version: 1 })

  const handleColorChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextColor = event.target.value
    if (nextColor === 'Blue' || nextColor === 'Grey' || nextColor === 'Red') {
      setBack({ ...back, color: nextColor })
    }
  }


  return (
    <div>
      <h1>Card testing </h1>
      <button onClick={() => setrank((rank) % 13 + 1)}>
        Increment rank
      </button>
      <button onClick={() => setSuit((suit + 1) % 4)}>
        Increment suit
      </button>
      <button onClick={() => setFaceUp(!faceUp)}>
        Flip card
      </button>
      <select value={back.color} onChange={handleColorChange}>
        <option value="Blue">Blue</option>
        <option value="Grey">Grey</option>
        <option value="Red">Red</option>
      </select>
      <select
        value={back.version}
        onChange={(event) => {
          const nextVersion = Number(event.target.value) as BackCardVersion
          setBack({ ...back, version: nextVersion })
        }}
      >
        <option value={1}>1</option>
        <option value={2}>2</option>
      </select>
      <Card faceUp={faceUp} front={{ rank: rank, suit: suit }} back={back} />
      <h1>Pile testing</h1>
      <Pile cards={createPileTestCards(3)} appearance={{ offset: 12, direction: 'up', maxVisible: 3 }} />
      <Pile cards={createPileTestCards(8)} appearance={{ offset: 8, direction: 'left', maxVisible: 5 }} />
      <Pile cards={createPileTestCards(52)} appearance={{ offset: 6, direction: 'down', maxVisible: 7 }} />
      <Pile cards={createPileTestCards(52)} appearance={{ offset: 24, direction: 'right', maxVisible: 52 }} />
      <h1>Hand testing</h1>
      <Hand
        cards={createPileTestCards(5)}
        center={{ x: 0, y: 0 }}
        offset={120}
        focus={false}
      />
    </div>
  )
}

export default App
