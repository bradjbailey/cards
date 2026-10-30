import './RulesOverlay.css'

interface RulesOverlayProps {
  onBack: () => void
}

export function RulesOverlay({ onBack }: RulesOverlayProps) {
  return (
    <div className="rules">
      <div className="rules__header">
        <button className="rules__back" onClick={onBack}>← Back</button>
        <h2 className="rules__title">Rules</h2>
      </div>

      <div className="rules__content">

        {/* Objective */}
        <section className="rules__section">
          <h3 className="rules__heading">Objective</h3>
          <p>Defeat every dungeon monster before your damage bar fills up. You win when the dungeon is cleared. You lose when 7 cards accumulate in your damage bar.</p>
        </section>

        {/* Decks */}
        <section className="rules__section">
          <h3 className="rules__heading">The Decks</h3>
          <p>The 54-card deck is split into two piles before play begins:</p>
          <ul className="rules__list">
            <li><strong>Monster deck</strong> — the 12 face cards (Jacks, Queens, Kings). These are dealt into the dungeon grid.</li>
            <li><strong>Power deck</strong> — all number cards (Ace–10) plus both Jokers. This is your weapon supply.</li>
          </ul>
        </section>

        {/* Turn structure */}
        <section className="rules__section">
          <h3 className="rules__heading">Each Turn: Draw → Attack → Discard</h3>
          <ol className="rules__list rules__list--ordered">
            <li><strong>Draw</strong> — Draw 3 cards from your power deck into your hand.</li>
            <li><strong>Attack</strong> — Play cards from your hand (and reserve, if any) onto monsters.</li>
            <li><strong>Discard</strong> — Any unplayed cards go to your damage bar. Then draw again.</li>
          </ol>
          <p className="rules__note">You may play cards onto multiple monsters in the same turn. You can also recall un-locked power cards from a monster back to your hand before discarding.</p>
        </section>

        {/* Attacking */}
        <section className="rules__section">
          <h3 className="rules__heading">Defeating a Monster</h3>
          <p>You need exactly <strong>3 cards</strong> to defeat a monster:</p>
          <ul className="rules__list">
            <li><strong>2 power cards</strong> — their ranks must sum to <em>at least</em> the monster's level.</li>
            <li><strong>1 trigger card</strong> — any rank, but it must match the monster's suit.</li>
          </ul>
          <p>The moment you play the trigger card, the monster is defeated. The monster and all 3 attack cards move to your clear pile, and any card beneath it in the dungeon is revealed.</p>

          <div className="rules__callout">
            <div className="rules__callout-label">Monster Levels</div>
            <div className="rules__levels">
              <div className="rules__level-item">Jack<span className="rules__level-value">= 11</span></div>
              <div className="rules__level-item">Queen<span className="rules__level-value">= 12</span></div>
              <div className="rules__level-item">King<span className="rules__level-value">= 13</span></div>
            </div>
          </div>

          <div className="rules__example">
            <div className="rules__example-label">Example</div>
            <p>Attacking the <span className="rules__suit rules__suit--hearts">Jack of Hearts ♥</span></p>
            <ul className="rules__list">
              <li>Power: 6 + 5 = 11 ✓ (meets the Jack's level of 11)</li>
              <li>Trigger: any <span className="rules__suit rules__suit--hearts">♥</span> card (rank doesn't matter)</li>
            </ul>
          </div>
        </section>

        {/* Locking */}
        <section className="rules__section">
          <h3 className="rules__heading">Locked Cards</h3>
          <p>Once a power card is on a monster and your turn ends, it becomes <strong>locked</strong> and cannot be recalled. Only cards placed during the current turn can be taken back.</p>
        </section>

        {/* Jokers */}
        <section className="rules__section">
          <h3 className="rules__heading">Jokers</h3>
          <p>Jokers count as <strong>10 power</strong> and can act as <strong>any suit</strong> when used as a trigger.</p>
        </section>

        {/* Damage bar */}
        <section className="rules__section">
          <h3 className="rules__heading">Damage Bar</h3>
          <p>Every card you don't (or can't) play gets discarded to your <strong>damage bar</strong>. If the damage bar ever reaches <strong>7 cards</strong>, you lose immediately — regardless of the dungeon state.</p>
          <p className="rules__note">Think carefully before discarding. A card wasted now is one fewer card to defeat monsters with later.</p>
        </section>

        {/* Winning */}
        <section className="rules__section">
          <h3 className="rules__heading">Winning & Score</h3>
          <p>Defeat all 12 monsters to win. Your <strong>score</strong> is the number of cards remaining in your power deck at the end. Cards in hand don't count.</p>
        </section>

        <div className="rules__divider" />

        {/* Variants */}
        <section className="rules__section">
          <h3 className="rules__heading rules__heading--variant">Optional Rules</h3>

          <div className="rules__variant">
            <div className="rules__variant-name">Boomer-Ace</div>
            <p>Aces are worth <strong>11</strong> instead of 1. When an Ace is used as a trigger card, it returns to your hand like a boomerang — it is not discarded.</p>
          </div>

          <div className="rules__variant">
            <div className="rules__variant-name">Power Reserve</div>
            <p>On your first turn, draw <strong>5 cards</strong> instead of 3. Choose 2 to set aside face-up as your reserve. Reserve cards can be played any time as power or trigger cards, but the reserve is never refilled. Each surviving reserve card adds <strong>+1</strong> to your final score.</p>
          </div>

          <div className="rules__variant">
            <div className="rules__variant-name">King Abilities</div>
            <p>Defeated Kings go into your inventory and grant <strong>one-time powers</strong> you can activate at any point during your turn:</p>
            <ul className="rules__list rules__list--abilities">
              <li><span className="rules__suit rules__suit--hearts">K♥</span> — Move one card from your hand to the bottom of your power deck.</li>
              <li><span className="rules__suit rules__suit--diamonds">K♦</span> — Peek at the bottom card of your power deck; optionally move it to the top.</li>
              <li><span className="rules__suit rules__suit--spades">K♠</span> — Double the value of one attack card already placed on a monster.</li>
              <li><span className="rules__suit rules__suit--clubs">K♣</span> — Immediately draw one extra card from your power deck.</li>
            </ul>
            <p className="rules__note">Using a King ability discards that King along with the defeated monster's attack pile.</p>
          </div>
        </section>

        <div className="rules__divider" />

        {/* Layouts */}
        <section className="rules__section">
          <h3 className="rules__heading rules__heading--variant">Dungeon Layouts</h3>
          <p>All layouts use the same 12 monsters. The shape changes which monsters are revealed first and how the dungeon unfolds.</p>

          <div className="rules__layouts">
            {[
              { name: 'Standard',    desc: '3 rows of 4 — wide and even.',                            grid: [[4],[4],[4]] },
              { name: 'Tall',        desc: '4 rows of 3 — deeper columns.',                           grid: [[3],[3],[3],[3]] },
              { name: 'Pyramid',     desc: 'Narrows from 4 at the front to 2 at the top.',            grid: [[2],[3],[3],[4]] },
              { name: 'Hourglass',   desc: 'Wide at front and back, pinches to 2 in the middle.',     grid: [[2],[2],[3],[2],[3]] },
              { name: 'Twin Spires', desc: 'Two independent spire columns converging at the front.',   grid: [[1],[2],[3],[1],[2],[3]] },
            ].map(({ name, desc, grid }) => (
              <div key={name} className="rules__layout">
                <div className="rules__layout-name">{name}</div>
                <div className="rules__layout-grid">
                  {grid.map((row, r) => (
                    <div key={r} className="rules__layout-row">
                      {row[0] > 0 && Array.from({ length: row[0] }).map((_, c) => (
                        <div key={c} className="rules__layout-cell" />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="rules__layout-desc">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="rules__credit">
          Clear the Dungeon — designed by Mark S. Ball
        </div>

      </div>
    </div>
  )
}
