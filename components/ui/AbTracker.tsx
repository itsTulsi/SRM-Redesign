"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { EXPERIMENTS, type ExperimentId } from "@/lib/ab";

const send = (e: string, v: string, t: "view" | "goal") => {
  const body = JSON.stringify({ e, v, t, p: location.pathname });
  try {
    if (!navigator.sendBeacon?.("/api/ab", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/ab", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Counting is best-effort; the page never depends on it.
  }
};

/**
 * Counts A/B exposures and conversions (lib/ab.ts). A "view" is sent once per page for each experiment whose variant is
 * on screen in the page; a "goal" when a [data-ab-goal] element is clicked or a form inside one is submitted.
 */
export function AbTracker() {
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const variantOf = (e: string) => html.getAttribute(`data-ab-${e}`);
    const seen = new Set<string>();
    for (const el of document.querySelectorAll<HTMLElement>("[data-ab][data-ab-variant]")) {
      const e = el.dataset.ab!;
      if (!(e in EXPERIMENTS) || seen.has(e) || el.dataset.abVariant !== variantOf(e) || !el.getClientRects().length) continue;
      seen.add(e);
      send(e, variantOf(e)!, "view");
    }
    const done = new Set<string>();
    const goal = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.<HTMLElement>("[data-ab-goal]");
      const e = el?.dataset.abGoal as ExperimentId | undefined;
      const v = e ? variantOf(e) : null;
      if (!e || !v || !(e in EXPERIMENTS) || done.has(e)) return;
      done.add(e);
      send(e, v, "goal");
    };
    const onClick = (ev: MouseEvent) => goal(ev.target);
    const onSubmit = (ev: SubmitEvent) => goal(ev.target);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [path]);
  return null;
}
