"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import type { WalkScript } from "@/lib/walk/script";

// three.js and the game load only after "Begin": never part of the page's first download.
const WalkGame = dynamic(() => import("./WalkGame"), { ssr: false });

const webgl = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

/** The opening screen's buttons, and the full-screen game once started. Lite Mode and no-WebGL get the tour instead. */
export function WalkLauncher({ script, labels }: { script: WalkScript; labels: { begin: string; outfitFirst: string; textTour: string; lite: string; noWebgl: string } }) {
  const { lite } = useLiteMode();
  const [gl, setGl] = useState(true);
  const [run, setRun] = useState<null | { outfit: boolean }>(null);
  useEffect(() => setGl(webgl()), []);
  // Warm the game chunk on hover/focus so "Begin" feels instant.
  const warm = () => void import("./WalkGame");

  if (lite || !gl)
    return (
      <div className="mt-8 flex flex-col items-start gap-3">
        <p className="max-w-xl rounded-2xl border border-white/15 p-4 text-[var(--fg-muted)]">{lite ? labels.lite : labels.noWebgl}</p>
        <a href="#walk-tour" className="grail-cta">
          {labels.textTour}
        </a>
      </div>
    );

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onPointerEnter={warm} onFocus={warm} onClick={() => setRun({ outfit: false })} className="grail-cta min-h-14 px-8 text-lg">
          {labels.begin} ▸
        </button>
        <button
          type="button"
          onPointerEnter={warm}
          onFocus={warm}
          onClick={() => setRun({ outfit: true })}
          className="inline-flex min-h-12 items-center rounded-full border border-[var(--line)] px-6 font-semibold text-[var(--fg)] hover:border-[var(--fg)]"
        >
          👕 {labels.outfitFirst}
        </button>
        <a href="#walk-tour" className="inline-flex min-h-12 items-center px-2 font-semibold text-[var(--fg)] underline underline-offset-4">
          {labels.textTour}
        </a>
      </div>
      {run ? <WalkGame script={script} startWithOutfit={run.outfit} onExit={() => setRun(null)} /> : null}
    </>
  );
}
