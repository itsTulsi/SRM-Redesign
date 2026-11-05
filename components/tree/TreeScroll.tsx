"use client";

import { useEffect, useRef } from "react";
import { SECTION } from "@/lib/sections";

const ACTS = [SECTION.learn, SECTION.leap, SECTION.lead];

/**
 * Writes one CSS variable (--p, 0..1 across the three acts) per animation frame; CSS does the rest.
 * Act offsets are cached and only re-measured on resize, so scrolling never forces layout.
 */
export function TreeScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let spans: { top: number; height: number }[] = [];
    let finaleTop = Infinity;
    let frame = 0;

    const measure = () => {
      spans = ACTS.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { top: Infinity, height: 1 };
        const rect = el.getBoundingClientRect();
        return { top: rect.top + window.scrollY, height: Math.max(rect.height, 1) };
      });
      const finale = document.querySelector("[data-tree-finale]");
      finaleTop = finale ? finale.getBoundingClientRect().top + window.scrollY : Infinity;
    };

    let visible = false;
    const update = () => {
      frame = 0;
      // Show the tree only while the acts are on screen: never over the hero search or the footer links.
      const first = spans[0];
      const last = spans[spans.length - 1];
      // Hand-off: the corner tree steps aside as the full-grown tree at the end of Act III comes into view.
      const nowVisible =
        !!first &&
        !!last &&
        window.scrollY + window.innerHeight > first.top + 160 &&
        window.scrollY + window.innerHeight * 0.3 < last.top + last.height &&
        window.scrollY + window.innerHeight * 0.85 < finaleTop;
      if (nowVisible !== visible) {
        visible = nowVisible;
        root.dataset.treeVisible = String(visible);
      }
      // Reading line at 60% of the viewport: an act counts as "grown" once you've read through it.
      const line = window.scrollY + window.innerHeight * 0.6;
      const total = spans.reduce((sum, s) => sum + Math.min(Math.max((line - s.top) / s.height, 0), 1), 0);
      root.style.setProperty("--p", (total / spans.length).toFixed(4));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    update();
    const resize = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    resize.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} data-tree-visible="false" style={{ "--p": 0 } as React.CSSProperties}>
      {children}
    </div>
  );
}
