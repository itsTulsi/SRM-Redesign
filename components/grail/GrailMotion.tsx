"use client";

import { useEffect } from "react";

/**
 * The page's motion wiring, in one small effect (no library):
 * - headings rise as they scroll into view (Rise);
 * - sections stack: each sticks while the next sheet slides over it. A section taller than the screen sticks only
 *   once its bottom is in view, so none of it is ever covered unread (--stack-top);
 * - the floating dock takes the colours of the section under it.
 * Without JavaScript, or with reduced motion, everything is simply shown.
 */
export function GrailMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.grailReady = "";

    const rise = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.in = "";
          rise.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    document.querySelectorAll("[data-rise='']").forEach((el) => rise.observe(el));

    const stacks = [...document.querySelectorAll<HTMLElement>(".grail-stack")];
    // Stick just under the site header; a section taller than what's left of the screen sticks once its bottom is in view.
    const sizeStacks = () => {
      const header = document.querySelector("header")?.offsetHeight ?? 0;
      stacks.forEach((s) => s.style.setProperty("--stack-top", `${Math.min(header, window.innerHeight - s.offsetHeight)}px`));
    };
    const resize = new ResizeObserver(sizeStacks);
    stacks.forEach((s) => resize.observe(s));
    window.addEventListener("resize", sizeStacks);

    const dock = document.querySelector<HTMLElement>(".grail-dock");
    const tones = [...document.querySelectorAll<HTMLElement>("[data-tone]")];
    let frame = 0;
    const toneUnderDock = () => {
      frame = 0;
      if (!dock) return;
      const y = window.innerHeight - 50;
      // Last match wins: later sheets sit on top of the pinned sections before them.
      const under = tones.filter((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      }).pop();
      dock.dataset.on = under?.dataset.tone ?? "hero";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(toneUnderDock);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    toneUnderDock();

    return () => {
      rise.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", sizeStacks);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      delete root.dataset.grailReady;
    };
  }, []);
  return null;
}
