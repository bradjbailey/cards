# Clear the Dungeon — Claude context

Solitaire card game. React 19 + TypeScript + Vite. **All game logic is complete and tested** — work here is UI/UX.

## Run & verify

```bash
npm run dev      # http://localhost:5173
npm test         # vitest — must stay green
npm run build    # must stay clean (strict TS: noUnusedLocals/Parameters)
```

## Architecture

```
src/game/          # pure logic — reducer, deck, helpers (don't break tests)
  state.ts         # GameState, gameReducer, helpers: placementError, powerSum, monsterLevel, suitName…
  deck.ts          # createFullDeck(back)
  state.test.ts    # ~27 tests — run before committing
src/components/    # UI — edit freely
  GameBoard.tsx/css       # top-level shell, idle/playing/won/lost phases
  Dungeon.tsx/css         # dungeon grid (dungeonGrid: row[][])
  DungeonCell.tsx         # one monster slot; attack fan; attack-badge overlay
  PlayerArea.tsx/css      # power deck, hand, damage, cleared, reserve, kings
  Hand.tsx                # absolute-positioned hand cards
  Card.tsx/css            # card component; CSS vars --card-width/height/radius
  SettingsModal.tsx/css   # color pickers + card back selector
  RulesOverlay.tsx/css    # full-screen rules page
  NewGameModal.tsx/css    # layout + optional rules toggles
  DevPanel.tsx/css        # dev-only scenario loader (bottom-right ⚙)
  Pile.tsx/css            # stacked card pile with counter
  CardPeek.tsx            # K♦ peek UI
  DiscardOverlay.tsx      # scrollable card list
  ReserveSelection.tsx    # K♣ reserve pick UI
src/hooks/
  useAppSettings.ts       # localStorage settings; applyColors() sets 10 CSS vars on :root
src/main.tsx              # pre-render color application from localStorage
```

## Key data shapes

```ts
// Suits: 0=Clubs 1=Diamonds 2=Hearts 3=Spades
// Ranks: 1=Ace…10, 11=Jack, 12=Queen, 13=King
// dungeonGrid: CardData[][] — rows (not columns); row 0 = deepest/back, last row = front (face-up)
// attacks: Record<`${row},${col}`, CardData[]> — up to POWER_SLOTS(2) power cards
// POWER_SLOTS=2, HAND_SIZE=3, MAX_DAMAGE=7
```

## CSS theming

Ten CSS vars on `:root` — set by `applyColors()` in `useAppSettings`. Card sizes are `--card-width/height/radius` on `:root`; override on a parent element to resize cards (used for attack pile small cards: `--card-width:62px; --card-height:89px`).

## Visual screenshots (Playwright)

Chromium headless shell at:
`/home/brad_pc/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`

```js
// Template for ad-hoc screenshot scripts in /tmp/pw_*.mjs
import { chromium } from '/home/brad_pc/.npm/_npx/84539a01c0e4c364/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({
  executablePath: '/home/brad_pc/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox']
})
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto('http://localhost:5173')
```

Dev panel (bottom-right ⚙ during a game): loads **Boomer-Ace** and **King Abilities** test scenarios.

## Settings persistence

`localStorage` key `ctd_app_settings` — `{ colors: { bg, primary, secondary }, cardBack: { color, version } }`.

## What's been built

- Full gameplay: place/recall attack cards, end turn, win/lose
- Optional rules: Boomer-Ace, Power Reserve, King Abilities (with K♥♦♠♣ special powers)
- 5 dungeon layouts: Standard, Tall, Pyramid, Hourglass, Twin Spires
- Settings modal: color theme pickers + card back selector
- Rules overlay with layout previews
- Attack card fan animation on monsters; visual badge (suit pip + power/level) on monster top-right
- Dark theme with CSS custom properties throughout
