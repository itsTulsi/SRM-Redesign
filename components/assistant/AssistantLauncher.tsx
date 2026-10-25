"use client";

import { useTranslations } from "next-intl";
import { lazy, Suspense, useRef, useState } from "react";

// The panel (and its UI code) loads only when someone reaches for it.
const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = lazy(loadPanel);

/** Floating "Ask SRM" button on every page. Tiny; the chat panel is fetched on hover/focus/tap. */
export function AssistantLauncher() {
  const t = useTranslations("Assistant");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={loadPanel}
        onFocus={loadPanel}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className="assistant-launcher fixed right-4 bottom-4 z-40 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-line bg-paper font-semibold text-ink shadow-lg sm:px-4"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
          <path
            d="M4 5h16v11H9l-5 4V5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="10.5" r="1.2" fill="currentColor" />
          <circle cx="12.5" cy="10.5" r="1.2" fill="currentColor" />
          <circle cx="16" cy="10.5" r="1.2" fill="currentColor" />
        </svg>
        {/* Icon-only on phones so it covers as little content as possible; the name stays for screen readers. */}
        <span className="max-sm:sr-only">{t("launcher")}</span>
      </button>
      {mounted ? (
        <Suspense fallback={null}>
          <AssistantPanel
            open={open}
            onClose={() => {
              setOpen(false);
              // The launcher is hidden while the panel is open; refocus once it's visible again.
              requestAnimationFrame(() => buttonRef.current?.focus());
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
