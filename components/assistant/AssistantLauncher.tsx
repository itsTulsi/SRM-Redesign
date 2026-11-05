"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Buddy } from "./Buddy";

// The panel (and its UI code) loads only when someone reaches for it.
const loadPanel = () => import("./AssistantPanel");
const AssistantPanel = lazy(loadPanel);

/** Floating "Ask SRM" button on every page. Tiny; the chat panel is fetched on hover/focus/tap. */
export function AssistantLauncher({ call }: { call: { display: string; tel: string } }) {
  const t = useTranslations("Assistant");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  const [hop, setHop] = useState(0);
  const [nudge, setNudge] = useState(false);

  // Leafy travels with you: it hops when you move to another page, and says hello once per visit.
  useEffect(() => {
    setHop((n) => n + 1);
  }, [path]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("srm-leafy-hello")) return;
      sessionStorage.setItem("srm-leafy-hello", "1");
    } catch {
      return;
    }
    const show = window.setTimeout(() => setNudge(true), 5000);
    const hide = window.setTimeout(() => setNudge(false), 12000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <div className="assistant-launcher fixed right-3 bottom-3 z-40 flex items-end gap-2 sm:right-4 sm:bottom-4">
        {nudge ? (
          <p aria-hidden="true" className="leafy-bubble mb-3 max-w-[11rem] rounded-2xl rounded-br-sm bg-[#fff] px-3 py-2 text-sm font-semibold text-[#1a1018] shadow-lg">
            {t("nudge")}
          </p>
        ) : null}
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onPointerEnter={loadPanel}
          onFocus={loadPanel}
          onClick={() => {
            setNudge(false);
            setMounted(true);
            setOpen(true);
          }}
          className="leafy-btn group relative inline-flex min-h-14 items-center gap-2 rounded-full border border-line bg-paper pr-1 pl-1 font-semibold text-ink shadow-lg sm:pr-4"
        >
          <span key={hop} className="leafy-hop grid size-12 shrink-0 place-items-center rounded-full bg-[#623562]">
            <Buddy className="size-11" />
          </span>
          {/* Icon-only on phones so it covers as little content as possible; the name stays for screen readers. */}
          <span className="max-sm:sr-only">{t("launcher")}</span>
        </button>
      </div>
      {mounted ? (
        <Suspense fallback={null}>
          <AssistantPanel
            call={call}
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
