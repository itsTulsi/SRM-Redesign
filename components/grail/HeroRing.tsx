"use client";

import { useState } from "react";

/** Rungs up the helix's axis, bottom to top; 0 is level with the emblem. */
const RUNGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

/**
 * The hero's DNA helix, standing upright like the reference's turning column of cards: two strands spiral round
 * a vertical axis, joined by rungs, with SRM's emblem at the centre. The helix turns; each card faces outward, so it
 * swings edge-on at the sides, and when it's behind you see its back, a kolam pattern, never mirrored text.
 * Plain CSS 3D: no library, runs on the compositor. Decorative, so hidden from screen readers; it moves on its own,
 * so it has a pause button (WCAG 2.2.2). Still under reduced motion or Lite Mode.
 */
export function HeroRing({ items, center, pause, play }: { items: React.ReactNode[]; center: React.ReactNode; pause: string; play: string }) {
  const [paused, setPaused] = useState(false);
  const backs = items.filter((_, i) => i % 2 === 1);
  const cells = RUNGS.map((j, r) => ({ j, cards: [0, 1].map((strand) => ({ strand, i: r * 2 + strand })) }));
  return (
    <div className="relative mb-10 lg:mb-16">
      <div aria-hidden="true" className="grail-ring-stage">
        <div className="grail-helix-view">
          <div className="grail-helix" data-paused={paused ? "" : undefined}>
            {cells.map(({ j, cards }) => (
              <div key={j} className="grail-helix-slot" style={{ "--j": j } as React.CSSProperties}>
                <span className="grail-helix-rung" />
                {cards.map(({ strand, i }) => (
                  <div key={strand} className="grail-helix-item" style={{ "--strand": strand } as React.CSSProperties}>
                    <div className="grail-ring-face">
                      <div className="grail-helix-front">{items[i % items.length]}</div>
                      <div className="grail-helix-back">{backs[(i + 1) % backs.length]}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* The emblem sits flat in front, at the helix's centre, so nothing ever covers it. */}
        <div className="grail-helix-center">{center}</div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="grail-ring-toggle absolute right-4 bottom-4 z-20 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-black/60 px-3 text-sm text-[var(--fg)] backdrop-blur sm:right-8 lg:bottom-8"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
          {paused ? <path d="M4 2l10 6-10 6z" fill="currentColor" /> : <path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor" />}
        </svg>
        <span className="sr-only sm:not-sr-only">{paused ? play : pause}</span>
      </button>
    </div>
  );
}
