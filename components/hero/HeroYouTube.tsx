"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import { afterLoadIdle } from "@/lib/after-load";
import { heavyMediaAllowed, motionAllowed } from "@/lib/motion";

const ORIGIN = "https://www.youtube-nocookie.com";

/** YouTube IFrame API commands over postMessage. */
function postCommand(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), ORIGIN);
}

/**
 * Background film: no captions (the hero has its own headline). cc_load_policy=0 asks YouTube not to show them;
 * unloading the captions module also overrides a channel's "captions on by default".
 */
function hideCaptions(frame: HTMLIFrameElement | null) {
  postCommand(frame, "unloadModule", ["captions"]);
  postCommand(frame, "unloadModule", ["cc"]);
}

/**
 * SRM's own YouTube film as the hero background, muted and looping. The poster (a frame of the same film) is the
 * first paint; the privacy-enhanced player is mounted after load, on the visitor's first interaction, never in Lite
 * Mode or under reduced motion, and fades in only once YouTube reports it is playing — so its title card never shows. It pauses when the
 * hero scrolls out of view, and a pause control is always available (WCAG 2.2.2).
 */
export function HeroYouTube({ id, title }: { id: string; title: string }) {
  const t = useTranslations("Hero");
  const { lite } = useLiteMode();
  const [allowed, setAllowed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);

  // Read the live DOM state (not the server snapshot) before deciding to fetch anything from YouTube.
  useEffect(() => {
    setAllowed(heavyMediaAllowed() && motionAllowed() && !lite);
  }, [lite]);

  useEffect(() => {
    if (!allowed) {
      setMounted(false);
      setVisible(false);
      return;
    }
    // YouTube's player sets third-party cookies once it plays, so it starts on the visitor's first interaction
    // (pointer, scroll, touch or key) after load — nothing from YouTube loads for someone who never engages.
    let cancelled = false;
    const events = ["pointermove", "pointerdown", "wheel", "scroll", "touchstart", "keydown"] as const;
    const start = () => {
      events.forEach((e) => window.removeEventListener(e, start));
      if (!cancelled) setMounted(true);
    };
    const cancelIdle = afterLoadIdle(() => events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true })), 2500);
    return () => {
      cancelled = true;
      cancelIdle();
      events.forEach((e) => window.removeEventListener(e, start));
    };
  }, [allowed]);

  const command = (func: "playVideo" | "pauseVideo") => postCommand(frameRef.current, func);

  // YouTube's IFrame API over postMessage: fade in on the first "playing" state.
  useEffect(() => {
    if (!mounted) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.info?.playerState === 1) {
          hideCaptions(frameRef.current);
          setVisible(true);
        }
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener("message", onMessage);
    const fallback = setTimeout(() => setVisible(true), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(fallback);
    };
  }, [mounted]);

  // Pause off-screen (saves battery and data); resume on return unless the visitor paused it.
  useEffect(() => {
    const box = boxRef.current;
    if (!mounted || !box) return;
    const io = new IntersectionObserver(([entry]) => {
      if (userPaused.current) return;
      command(entry!.isIntersecting ? "playVideo" : "pauseVideo");
    });
    io.observe(box);
    return () => io.disconnect();
  }, [mounted]);

  if (!allowed || !mounted) return null;

  const src = `${ORIGIN}/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  const toggle = () => {
    userPaused.current = playing;
    command(playing ? "pauseVideo" : "playVideo");
    hideCaptions(frameRef.current);
    setPlaying(!playing);
  };

  return (
    <>
      <div
        ref={boxRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden transition-opacity duration-1000 [container-type:size] ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          onLoad={() => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), ORIGIN)}
          // Cover the hero at any aspect ratio, overscanned and nudged down so YouTube's edge chrome and the band where
          // captions would sit stay out of frame.
          className="absolute top-[56%] left-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 scale-[1.15] border-0"
        />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!playing}
        // Phones: top-right of the video, clear of the audience chips; larger screens: bottom-left.
        className="absolute top-4 right-4 z-10 inline-flex size-11 items-center justify-center rounded-full border border-line bg-bg/70 text-fg sm:top-auto sm:right-auto sm:bottom-4 sm:left-4"
      >
        <span className="sr-only">{playing ? t("pauseVideo") : t("playVideo")}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /> : <path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor" />}
        </svg>
      </button>
    </>
  );
}
