# Clear the Dungeon — UI Implementation Handoff

This document hands off the **UI build-out** of Clear the Dungeon. The game rules
and all state logic are **already implemented and tested** in `src/game/`. Your
job is to wire the existing presentational React components to that logic so the
game is fully playable in a browser.

> **Read this whole file before writing code.** Everything you need to know about
> the rules, the data model, and the reducer API is here. You should not need to
> re-derive the rules from `ClearTheDungeon.md`.

---

## 0. Ground rules for the implementer

**Do not change `src/game/state.ts` or `src/game/deck.ts` logic.** They are the
source of truth and are covered by tests. If you genuinely believe a rule is
wrong, first add a *failing* test to `src/game/state.test.ts` that demonstrates
it, then fix — never edit logic silently.

**Verify constantly.** All four must stay green:

```bash
npm test          # vitest — game logic (currently 27 tests passing)
npx tsc --noEmit  # type check (strict; noUnusedLocals/Parameters are ON)
npm run lint      # eslint
npm run build     # vite production build
```

Run the game while developing:

```bash
npm run dev       # http://localhost:5173
```

**Strictness gotchas:** `noUnusedLocals` and `noUnusedParameters` are enabled, so
remove unused imports/vars or TypeScript will fail the build. Prefix an
intentionally-unused parameter with `_`.

---

## 1. The game in one screen

You are clearing a dungeon of 12 monster cards (the face cards). A monster's
**power level** is its rank: **Jack 11, Queen 12, King 13**. Each monster also has
a **suit**.

Your **power deck** is A(1)–10 plus two Jokers (42 cards). **Jokers are worth 10
and count as any suit.** Aces are low (worth 1).

**Defeating one monster always costs exactly 3 cards:**
1. Two **power cards** whose values **sum to ≥ the monster's level** (suit ignored).
2. One **trigger card** whose **suit matches the monster** (a Joker matches any
   suit). The monster dies the instant the trigger lands.

**Turn loop:** you hold **3 cards**. Place any of them on monsters, then **end the
turn**: every card still in your hand is discarded to the **damage bar**, and you
draw a fresh hand. **7 cards in the damage bar = you lose.** Partial attacks stay
on monsters between turns (this is the core tension — you rarely finish a monster
in one turn).

**Win** by clearing all 12 monsters. **Score = cards left in the power deck.**
**Lose** by filling the damage bar, or by running out of power cards with monsters
still standing.

---

## 2. Data model & logic API (already built — this is your toolbox)

### Card (`src/components/Card.tsx`)

```ts
interface CardData {
  faceUp: boolean
  front: { rank: number; suit: number; joker?: true }
  back: { color: 'Blue' | 'Grey' | 'Red'; version: 1 | 2 }
}
```

- **Suits:** `0` Clubs, `1` Diamonds, `2` Hearts, `3` Spades.
- **Ranks:** `1` Ace … `10`, `11` Jack, `12` Queen, `13` King. Jokers have
  `rank: 0, joker: true` (their `suit` only picks the image color).

### Game state (`src/game/state.ts`)

```ts
type GamePhase = 'idle' | 'playing' | 'won' | 'lost'

interface GameState {
  phase: GamePhase
  dungeonColumns: CardData[][] // 4 columns; LAST card of each = the revealed monster
  attacks: CardData[][]        // cards placed on each column's active monster
  lockedCount: number[]        // per column: attack cards locked from past turns
  powerDeck: CardData[]
  hand: CardData[]
  selectedHandIndex: number | null
  damagePile: CardData[]       // the damage bar; length >= 7 => loss
  clearPile: CardData[]        // defeated monsters + the cards that beat them
  message: string | null       // transient player-facing message — show this!
  score: number | null          // set only when phase === 'won'
}
```

Key invariants you can rely on:
- The **active monster** of a column is its **last element**. An **empty column is
  cleared.** `attacks[i]` always has length `0`, `1`, or `2` for an active monster
  (the 3rd card defeats it immediately and clears the slot).
- `attacks[i]` slots `0` and `1` are **power cards**; a legal slot-2 card is the
  trigger that defeats the monster.

### Actions (dispatch these)

| Action | Effect |
| --- | --- |
| `{ type: 'NEW_GAME' }` | Deal a fresh dungeon + hand, `phase → 'playing'`. Use for both the start button and "play again". |
| `{ type: 'SELECT_HAND', index }` | Select/deselect a hand card (toggles if same index). |
| `{ type: 'PLACE_CARD', columnIndex }` | Place the selected hand card on that column's monster. Fills power slots first; a valid 3rd card defeats the monster, reveals the next, and may win. Illegal moves set `message` and change nothing else. |
| `{ type: 'RECALL_CARD', columnIndex, slotIndex }` | Return a power card **placed this turn** to the hand. Cards locked from previous turns are refused (sets `message`). |
| `{ type: 'END_TURN' }` | Discard remaining hand to the damage bar, lock partial attacks, draw up to 3. May transition to `'lost'`. |

Actions are ignored when `phase !== 'playing'` (except `NEW_GAME`).

### Helper functions (import from `../game/state`) — use these in the UI

| Helper | Use |
| --- | --- |
| `activeMonster(column)` | The revealed monster, or `null` if the column is cleared. |
| `monsterLevel(monster)` | Power needed (= rank). |
| `monsterName(monster)` | e.g. `"King of Spades"` — for labels. |
| `suitName(suit)` | e.g. `"Hearts"`. |
| `cardPower(card)` | A card's attack value (Joker → 10). |
| `powerSum(attack)` | Running total of the placed power cards. |
| `placementError(state, card, columnIndex)` | `null` if placing `card` there is **legal right now**, else a human-readable reason. **Use this to highlight legal targets and to preview why a move is blocked.** |
| `POWER_SLOTS` (2), `ATTACK_SIZE` (3), `HAND_SIZE` (3), `MAX_DAMAGE` (7) | Constants — don't hard-code these numbers. |

---

## 3. What already exists

- `src/game/deck.ts` — deck creation, shuffle, monster/power split. **Done.**
- `src/game/state.ts` — full reducer + helpers. **Done, tested.**
- `src/game/state.test.ts` — 27 passing tests. Add to it; don't weaken it.
- `src/components/*` — `Card`, `Pile`, `Hand`, `Dungeon`, `DungeonColumn`,
  `PlayerArea`, `GameBoard`. **Presentational only — currently not interactive.**
- `src/DevHarness.tsx` — a component sandbox (not mounted). Handy for eyeballing
  cards/piles; ignore otherwise.

`GameBoard` currently shows a start button and a static board after `NEW_GAME`.
Everything below is about making that board playable.

---

## 4. The work

### Phase B — Interactivity (the core of the task)

**B1. `Card.tsx` — make cards clickable and styleable.**
Add optional props (keep existing behavior when they're absent):

```ts
interface CardProps extends CardData {
  onClick?: () => void
  selected?: boolean   // e.g. gold outline / raised
  highlight?: boolean  // legal target — e.g. green glow
  dimmed?: boolean      // not a legal target right now — reduce opacity
}
```

Apply classes in `Card.css`. Add `cursor: pointer` when `onClick` is set, and a
visible focus state (cards should be keyboard-activatable — render as a `<button>`
or add `role="button"` + `tabIndex`). Fix the `alt` text to use `suitName`/rank
names instead of the raw suit number.

**B2. `Hand.tsx` — select cards.**
Give each card `onClick={() => dispatch({ type: 'SELECT_HAND', index })}` and
`selected={index === selectedHandIndex}`. Hand needs `selectedHandIndex` and an
`onSelect` (or `dispatch`) prop threaded from `GameBoard`.

**B3. `DungeonColumn.tsx` / `Dungeon.tsx` — target monsters & show attack progress.**
For each column, using the active monster:
- Show a badge with `monsterName(monster)` and `monsterLevel(monster)`, and the
  **required trigger suit**.
- Render the placed attack cards (`attacks[i]`) as a small fan (reuse `Hand` or a
  simple row). Show the **running power** `powerSum(attacks[i])` vs the level, and
  what's still needed: "place N more power card" when `< 2` cards, or "needs a
  {suit} trigger (power {sum}/{level})" when 2 are down.
- Clicking the column dispatches `{ type: 'PLACE_CARD', columnIndex }`.
- Clicking a placed attack card dispatches `{ type: 'RECALL_CARD', columnIndex,
  slotIndex }` (no-op/refused for locked cards — that's fine, the reducer handles
  it).
- **Highlighting:** when a hand card is selected, compute per column
  `placementError(state, selectedCard, columnIndex) === null` → `highlight` the
  legal ones and `dimmed` the rest. Pass these down to the monster card.

These components need `attacks`, `lockedCount`, `selectedHandIndex`, the whole
`state` (for `placementError`), and `dispatch`. Thread them from `GameBoard`.

**B4. `PlayerArea.tsx` — status.**
Show counts: **Power Deck** (`powerDeck.length`), **Damage Bar**
(`damagePile.length`/`MAX_DAMAGE`), and a **Clear Pile** count
(`clearPile.length`). The damage bar should look threatening as it approaches 7.

**B5. `GameBoard.tsx` — orchestrate.**
- Keep `useReducer(gameReducer, initialState)`.
- `idle`: existing start screen → `dispatch({ type: 'NEW_GAME' })`.
- `playing`: render `Dungeon` + `PlayerArea`, a **control bar** with an **End Turn
  (Discard & Draw)** button → `dispatch({ type: 'END_TURN' })`, and always render
  `state.message` when present (a small banner/toast).
- `won` / `lost`: an overlay showing `state.message`, the score on a win
  (`state.score`), and a **Play Again** button → `dispatch({ type: 'NEW_GAME' })`.

Skeleton to build on:

```tsx
const [state, dispatch] = useReducer(gameReducer, initialState)

if (state.phase === 'idle') { /* existing start screen */ }

const gameOver = state.phase === 'won' || state.phase === 'lost'

return (
  <div className="game-board">
    <Dungeon state={state} dispatch={dispatch} />
    <PlayerArea state={state} dispatch={dispatch} />
    <div className="game-board__controls">
      <button onClick={() => dispatch({ type: 'END_TURN' })} disabled={gameOver}>
        End Turn (Discard &amp; Draw)
      </button>
      {state.message && <p className="game-board__message">{state.message}</p>}
    </div>
    {gameOver && (
      <div className="game-board__overlay">
        <p>{state.message}</p>
        {state.phase === 'won' && <p>Score: {state.score}</p>}
        <button onClick={() => dispatch({ type: 'NEW_GAME' })}>Play Again</button>
      </div>
    )}
  </div>
)
```

> Prop style is your call: either thread `state` + `dispatch` down (shown above),
> or pass narrow props per component. Threading `state`/`dispatch` is simplest and
> fine for a game this size.

### Phase C — Polish

- Clear legal-target highlighting and a readable invalid-move message.
- The "needed suit / running power" indicator on each monster.
- Sensible responsive layout (4 dungeon columns + player area) and a dungeon
  background. The visual target: it should read like the physical layout — four
  overlapping columns of monsters.
- Optional: defeat/flip animations, drag-and-drop instead of click-to-select
  (click-to-select is the baseline; don't start with drag-and-drop).

### Phase F — Small cleanups

- `index.html` references `/src/main.jsx`; the file is `main.tsx`. It works today
  via Vite's resolution, but change it to `/src/main.tsx` for clarity.
- Card `alt` text (see B1).

---

## 5. Interaction model (exact, so there's no ambiguity)

1. Player clicks a **hand card** → it becomes selected (`SELECT_HAND`). Clicking it
   again deselects.
2. With a card selected, legal target columns are highlighted. Player clicks a
   **column/monster** → `PLACE_CARD`. If legal, the card moves there (and may
   defeat the monster); if not, `state.message` explains why and nothing else
   changes.
3. Player may click a **placed power card** to recall it this turn (`RECALL_CARD`).
4. When done, player clicks **End Turn** → leftover hand becomes damage, a new hand
   is drawn (`END_TURN`).
5. On win/loss, the overlay offers **Play Again** (`NEW_GAME`).

---

## 6. Definition of done

- [ ] From a fresh load you can start a game, and the opening hand + four revealed
      monsters are visible.
- [ ] Selecting a hand card highlights legal target columns; illegal clicks show a
      helpful message and change nothing.
- [ ] You can place two power cards then a matching-suit (or Joker) trigger and the
      monster is defeated, moves to the clear pile, and the next monster is
      revealed.
- [ ] Recall works for cards placed this turn and is refused for locked cards.
- [ ] End Turn discards the remaining hand into the damage bar and draws a new hand;
      the damage counter is visible.
- [ ] Winning shows the score; both loss conditions (damage bar full, power deck
      empty) end the game with a message. Play Again resets.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass.

---

## 7. Optional variations (stretch — only after the base game is done)

These are in the rules but **out of scope** for a first playable version. If you
add them, put each behind a settings toggle and add tests to `state.test.ts`:

- **Boomer-Ace:** Aces worth 11; an Ace used as a trigger returns to the hand.
- **Power Reserve:** draw 5 on turn 1, set 2 aside as always-available cards.
- **King special abilities:** defeated Kings grant one-shot powers (K♥ put a hand
  card on the bottom of the deck; K♦ peek/relocate the bottom card; K♠ double an
  attack card's value; K♣ draw a card). These would need new reducer actions and
  an "inventory" of defeated Kings in `GameState`.
- **Alternate dungeon layouts:** the non-rectangular layouts from the rules.

---

## 8. Suggested model / effort per task

The logic (the risky part) is done. The remaining work is mechanical and
well-specified, so a smaller/cheaper model is appropriate:

| Task | Suggested setup |
| --- | --- |
| B1–B5 component wiring | **Sonnet, medium effort** — mechanical, spec'd above. |
| C polish / CSS / layout | **Haiku or Sonnet, low–medium** — iterate visually against `npm run dev`. |
| F cleanups | **Haiku, low.** |
| Any new game logic (Phase 7 variations) | **Bump back up** — add tests first; this is the part worth more reasoning. |

If a session gets stuck in a debug loop (2+ failed attempts on one thing), raise
the model/effort rather than grinding — grinding re-reads context and costs more
than the upgrade. Keep `npm test` as your cheap correctness oracle throughout.
