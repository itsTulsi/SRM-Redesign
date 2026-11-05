"use client";

import { useEffect, useRef, useState } from "react";

const FRAMES = 73;
const src = (i: number) => `/media/intro/f-${String(i + 1).padStart(3, "0")}.webp`;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The opening: a camera glide towards the SRM gate that plays as you scroll, then melts into the homepage.
 * A short image sequence on a canvas (smooth in every browser, nothing autoplays, no sound). It is shown only on the
 * first visit of a session, and never in Lite Mode, with reduced motion, or on a Save-Data connection; the page's
 * head script decides that before first paint (html[data-intro="on"]), so nothing jumps. Everything here is
 * decorative: the page's real heading and content sit underneath, in the HTML, from the start.
 */
export function IntroGate({ label, hint, skip, loading }: { label: string; hint: string; skip: string; loading: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const cv = canvas.current;
    const box = root.current;
    if (html.dataset.intro !== "on" || !cv || !box) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // Load every other frame first (a coarse but complete glide), then the frames in between.
    const imgs: (HTMLImageElement | null)[] = Array(FRAMES).fill(null);
    let loaded = 0;
    const order = [...Array(FRAMES).keys()].sort((a, b) => (a % 2) - (b % 2) || a - b);
    let alive = true;
    const pump = (k: number) => {
      if (!alive || k >= order.length) return;
      const i = order[k]!;
      const im = new Image();
      im.onload = im.onerror = () => {
        if (im.naturalWidth) imgs[i] = im;
        loaded++;
        setReady(loaded / FRAMES);
        draw();
        pump(k + 4); // four downloads at a time
      };
      im.src = src(i);
    };
    [0, 1, 2, 3].forEach(pump);

    let progress = 0;
    let shown = -1;
    const pick = () => {
      const want = Math.round(progress * (FRAMES - 1));
      for (let d = 0; d < FRAMES; d++) {
        const a = imgs[want - d] ?? imgs[want + d];
        if (a) return a;
      }
      return null;
    };
    function draw() {
      const im = pick();
      if (!im) return;
      const w = cv!.width;
      const h = cv!.height;
      // "Cover": fill the screen, cropping the sides on a phone, with a slow push-in as you scroll.
      const zoom = 1 + progress * 0.08;
      const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
      ctx!.drawImage(im, (w - im.naturalWidth * s) / 2, (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
    }
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
      draw();
    };
    size();

    // The spacer is 300svh tall; the page's own content starts 200svh down. The glide plays over the first 85% of that
    // and the picture fades out over the last 25%, as the camera passes under the gate.
    let frame = 0;
    const tick = () => {
      frame = 0;
      const D = window.innerHeight * 2;
      const y = window.scrollY;
      progress = clamp(y / (D * 0.85));
      const fade = clamp((y - D * 0.75) / (D * 0.25));
      box.style.opacity = String(1 - fade);
      box.style.visibility = fade >= 1 ? "hidden" : "visible";
      box.style.pointerEvents = fade > 0.4 ? "none" : "auto";
      const idx = Math.round(progress * (FRAMES - 1));
      if (idx !== shown) {
        shown = idx;
        draw();
      }
      if (y >= D * 0.98) {
        try {
          sessionStorage.setItem("srm-intro-seen", "1");
        } catch {
          // Storage blocked: the intro may play again on the next visit; harmless.
        }
        setDone(true);
      } else setDone(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", size);
    tick();

    // While the intro covers the screen, keep the page behind it out of the tab order.
    const header = document.querySelector("header");
    header?.setAttribute("inert", "");
    const unlock = () => header?.removeAttribute("inert");
    const watch = window.setInterval(() => {
      if (box.style.visibility === "hidden") unlock();
      else header?.setAttribute("inert", "");
    }, 300);

    return () => {
      alive = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", size);
      cancelAnimationFrame(frame);
      clearInterval(watch);
      unlock();
    };
  }, []);

  function leave() {
    try {
      sessionStorage.setItem("srm-intro-seen", "1");
    } catch {
      // ignore
    }
    const html = document.documentElement;
    delete html.dataset.intro; // the spacer collapses, the page is where it should be
    window.scrollTo(0, 0);
  }

  return (
    <>
      <div className="grail-intro-spacer" aria-hidden="true" />
      <div ref={root} className="grail-intro" role="group" aria-label={label}>
        <canvas ref={canvas} aria-hidden="true" className="grail-intro-canvas" />
        <div aria-hidden="true" className="grail-intro-shade" />
        <button type="button" onClick={leave} className="grail-intro-skip">
          {skip}
        </button>
        <div className="grail-intro-copy" aria-hidden={done}>
          <p className="grail-intro-name">SRM</p>
          <p className="grail-intro-hint">
            {ready < 0.5 ? loading : hint}
            <span aria-hidden="true" className="grail-intro-chev" />
          </p>
          <div aria-hidden="true" className="grail-intro-bar">
            <span style={{ transform: `scaleX(${ready})`, opacity: ready >= 1 ? 0 : 1 }} />
          </div>
        </div>
      </div>
    </>
  );
}
