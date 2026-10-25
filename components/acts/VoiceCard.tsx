"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A YouTube Short as a "facade": a plain link to the video with our own (local) poster frame. Nothing from
 * YouTube loads until the visitor taps it; then the privacy-enhanced player replaces the link in place.
 * Without JavaScript — or with Cmd/Ctrl-click — it is just a link to YouTube.
 */
export function VoiceCard({ youtubeId, title, poster, playLabel }: { youtubeId: string; title: string; poster: string | null; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <iframe
        ref={frameRef}
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full border-0"
      />
    );
  }

  return (
    <a
      href={`https://www.youtube.com/shorts/${youtubeId}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        setPlaying(true);
      }}
      aria-label={`${playLabel}: ${title}`}
      className="group relative block size-full"
    >
      {poster ? <Image src={poster} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" /> : null}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-paper/90 text-ink shadow-lg transition-transform group-hover:scale-110 sm:size-16">
          <svg viewBox="0 0 24 24" className="ml-1 size-6">
            <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
          </svg>
        </span>
      </span>
    </a>
  );
}
