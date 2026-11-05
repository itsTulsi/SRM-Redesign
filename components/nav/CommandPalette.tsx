"use client";

import { useTranslations } from "next-intl";
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import type { NavData } from "./types";

// The panel (and its UI code) loads only when someone reaches for it, like Ask SRM's.
const loadPanel = () => import("./CommandPanel");
const CommandPanel = lazy(loadPanel);

const noSubscribe = () => () => {};

/** Header search button, and ⌘K / Ctrl+K from anywhere. */
export function CommandPalette({ nav }: { nav: NavData }) {
  const t = useTranslations("Palette");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mac = useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.platform), () => true);

  const show = () => {
    setMounted(true);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMounted(true);
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        onPointerEnter={loadPanel}
        onFocus={loadPanel}
        onClick={show}
        className="needs-js inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-2 hover:bg-line-subtle xl:border xl:border-line xl:px-3"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0">
          <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="sr-only">{t("open")}</span>
        <kbd aria-hidden="true" className="hidden font-sans text-sm text-fg-muted xl:inline">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      {mounted ? (
        <Suspense fallback={null}>
          <CommandPanel nav={nav} open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
