"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import { heavyMediaAllowed, motionAllowed } from "@/lib/motion";

type Source = { src: string; type: string };

/**
 * Ambient campus loop. Never mounted in Lite Mode (no bytes fetched); never autoplays under reduced motion;
 * always has a pause control (WCAG 2.2.2). Muted and decorative — the poster carries the first paint.
 */
export function HeroVideo({ sources, poster }: { sources: Source[]; poster: string }) {
  const t = useTranslations("Hero");
  const { lite } = useLiteMode();
  const [allowed, setAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // Read the real DOM state (not the server snapshot) before mounting the <video>.
  useEffect(() => {
    setAllowed(heavyMediaAllowed() && !lite);
  }, [lite]);

  useEffect(() => {
    const video = ref.current;
    if (!allowed || !video || !motionAllowed()) return;
    video.play().then(() => setPlaying(true), () => setPlaying(false));
  }, [allowed]);

  if (!allowed) return null;

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().then(() => setPlaying(true), () => {});
    else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={ref}
        aria-hidden="true"
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        className="absolute inset-0 -z-10 size-full object-cover"
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!playing}
        className="absolute right-4 bottom-4 z-10 inline-flex size-11 items-center justify-center rounded-full border border-line bg-bg/70 text-fg"
      >
        <span className="sr-only">{playing ? t("pauseVideo") : t("playVideo")}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /> : <path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor" />}
        </svg>
      </button>
    </>
  );
}
