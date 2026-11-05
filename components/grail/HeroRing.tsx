"use client";

import { useState } from "react";

/**
 * The hero's slowly turning ring of quest cards and kolam tiles (the reference uses 3D canvas; this is plain CSS 3D,
 * so it costs no library and runs on the compositor). Decorative, so it's hidden from screen readers; anything that
 * moves on its own for more than five seconds gets a pause button (WCAG 2.2.2). Still under reduced motion.
 */
export function HeroRing({ items, center, pause, play }: { items: React.ReactNode[]; center: React.ReactNode; pause: string; play: string }) {
  const [paused, setPaused] = useState(false);
  return (
    // Its own band of the hero, below the title and buttons, so the cards never cover the words.
    <div className="relative mb-10 lg:mb-16">
      <div aria-hidden="true" className="grail-ring-stage">
        <div className="grail-ring" data-paused={paused ? "" : undefined} style={{ "--n": items.length } as React.CSSProperties}>
          {/* SRM's emblem sits at the centre; the quests orbit it. Everything turns back to face you as it goes,
              so nothing is ever seen mirrored, and cards pass in front of and behind the emblem. */}
          <div className="grail-ring-center">
            <div className="grail-ring-face">{center}</div>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grail-ring-item" style={{ "--i": i } as React.CSSProperties}>
              <div className="grail-ring-face">{item}</div>
            </div>
          ))}
        </div>
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
