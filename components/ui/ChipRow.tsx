"use client";

import type { FocusEvent, ReactNode } from "react";

type Props = { as?: "div" | "ul"; className?: string; children: ReactNode };

/**
 * A row of chips: wraps on wider screens, one swipeable row on phones (`.chip-row` in globals.css).
 * Chrome won't scroll a half-visible chip into the row on keyboard focus, so do it here.
 */
export function ChipRow({ as: Tag = "div", className = "", children }: Props) {
  const reveal = (e: FocusEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) e.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return (
    <Tag onFocus={reveal} className={`chip-row ${className}`}>
      {children}
    </Tag>
  );
}
