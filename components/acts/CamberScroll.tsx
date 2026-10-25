"use client";

import { useEffect, useRef } from "react";
import type { FrameSequence } from "@/lib/media";
import { heavyMediaAllowed, motionAllowed } from "@/lib/motion";

/**
 * Drives the Camber scene: scroll progress (--camber-p), callouts (data-on) and the scrubbed frame canvas.
 * No GSAP needed — one rAF-throttled scroll read per frame. Does nothing under reduced motion / Lite Mode,
 * where CSS has already laid the scene out as a normal, fully visible block.
 */
export function CamberScroll({
  frames,
  calloutCount,
  children,
}: {
  frames: FrameSequence | null;
  calloutCount: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = ref.current;
    if (!track || !motionAllowed()) return;
    const sticky = track.querySelector<HTMLElement>(".camber-sticky");
    const callouts = [...track.querySelectorAll<HTMLElement>("[data-callout]")];
    if (!sticky) return;
    track.dataset.live = "true";

    // Callout i appears at an evenly spaced point between 8% and 88% of the scene.
    const thresholds = callouts.map((_, i) => 0.08 + (i * 0.8) / Math.max(calloutCount - 1, 1));
    let progress = 0;
    let frame = 0;
    let drawFrame: ((p: number) => void) | null = null;

    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
      const travel = rect.height - sticky.offsetHeight;
      progress = travel > 0 ? Math.min(Math.max((stickyTop - rect.top) / travel, 0), 1) : 0;
      track.style.setProperty("--camber-p", progress.toFixed(4));
      track.toggleAttribute("data-started", progress > 0.03);
      callouts.forEach((c, i) => c.toggleAttribute("data-on", progress >= thresholds[i]!));
      drawFrame?.(progress);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // ── Frame sequence: only in full mode, only once the scene is near the viewport ──
    let teardownFrames: (() => void) | undefined;
    const slot = track.querySelector<HTMLElement>("[data-camber-canvas-slot]");
    const io =
      frames && slot && heavyMediaAllowed()
        ? new IntersectionObserver(
            (entries) => {
              if (!entries.some((e) => e.isIntersecting)) return;
              io?.disconnect();
              const seq = startSequence(slot, frames);
              drawFrame = seq.draw;
              teardownFrames = seq.stop;
              seq.draw(progress);
            },
            { rootMargin: "150% 0px" },
          )
        : null;
    io?.observe(track);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      io?.disconnect();
      teardownFrames?.();
      delete track.dataset.live;
      track.removeAttribute("data-started");
      track.style.removeProperty("--camber-p");
      callouts.forEach((c) => c.removeAttribute("data-on"));
    };
  }, [frames, calloutCount]);

  return (
    <div ref={ref} className="camber-track">
      {children}
    </div>
  );
}

/**
 * Canvas scrubber. Loads frame 0 first, then every 16th, 8th, 4th, 2nd, 1st — so scrubbing works (coarsely)
 * within moments and sharpens as the rest arrive. Draws the nearest loaded frame, cover-fitted.
 */
function startSequence(slot: HTMLElement, frames: FrameSequence) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const urls = slot.clientWidth * dpr > 1100 ? frames.lg : frames.sm;
  const images: (HTMLImageElement | null)[] = new Array(urls.length).fill(null);
  const canvas = document.createElement("canvas");
  canvas.className = "absolute inset-0 size-full";
  slot.append(canvas);
  const ctx = canvas.getContext("2d");
  let stopped = false;
  let current = 0;
  let drawn = -1;

  const nearestLoaded = (target: number) => {
    for (let d = 0; d < images.length; d++) {
      if (images[target - d]) return target - d;
      if (images[target + d]) return target + d;
    }
    return -1;
  };

  const paint = () => {
    const index = nearestLoaded(current);
    const img = index >= 0 ? images[index] : null;
    if (!img || !ctx) return;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawn = -1;
    }
    if (index === drawn) return;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    drawn = index;
  };

  const order: number[] = [];
  const seen = new Set<number>();
  for (const step of [urls.length, 16, 8, 4, 2, 1]) {
    for (let i = 0; i < urls.length; i += step) {
      if (seen.has(i)) continue;
      seen.add(i);
      order.push(i);
    }
  }

  (async () => {
    const queue = [...order];
    const worker = async () => {
      while (!stopped && queue.length) {
        const i = queue.shift()!;
        const img = new Image();
        img.decoding = "async";
        img.src = urls[i]!;
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (stopped) return;
        images[i] = img;
        paint();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  })();

  const resize = new ResizeObserver(() => {
    drawn = -1;
    paint();
  });
  resize.observe(canvas);

  return {
    draw(p: number) {
      current = Math.round(p * (urls.length - 1));
      paint();
    },
    stop() {
      stopped = true;
      resize.disconnect();
      canvas.remove();
    },
  };
}
