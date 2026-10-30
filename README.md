# Clear the Dungeon

A solitaire card game by Mark S. Ball, built as a React/TypeScript/Vite web app.

## How to play

Defeat all 12 dungeon monsters before your damage bar fills to 7 cards. Each monster requires exactly 3 cards to defeat: two power cards that sum to at least the monster's level (J=11, Q=12, K=13), plus a trigger card matching the monster's suit. Click **? Rules** in the app for the full rules.

## Dev

```bash
npm run dev      # http://localhost:5173
npm test         # vitest (game logic)
npm run build    # production build
npx tsc --noEmit # type check
npm run lint     # eslint
```

## Optional rules

Toggle in New Game modal: **Boomer-Ace** (Aces worth 11, bounce back from trigger), **Power Reserve** (set 2 cards aside turn 1), **King Abilities** (defeated kings grant one-shot powers).

## Source

Rules: `ClearTheDungeon.md` / `Clear the Dungeon.pdf`
