"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { loadedAssets } from "./OfflineSupport";

type State = "idle" | "saving" | "saved" | "failed";

/**
 * "Save for offline": asks the service worker to keep this page, its images, the programme list and admissions on
 * this device. Shown only once the worker is running; until then its space is kept, so nothing shifts.
 */
export function SaveOffline({ className = "" }: { className?: string }) {
  const t = useTranslations("Offline");
  const locale = useLocale();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const check = () => setReady(!!navigator.serviceWorker.controller);
    check();
    navigator.serviceWorker.addEventListener("controllerchange", check);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", check);
  }, []);

  const save = () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return;
    setState("saving");
    const prefix = locale === "en" ? "" : `/${locale}`;
    const media = [...document.images].map((img) => img.currentSrc).filter((src) => src.startsWith(location.origin));
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => setState("failed"), 30000);
    channel.port1.onmessage = (e: MessageEvent<{ ok: boolean }>) => {
      window.clearTimeout(timeout);
      setState(e.data.ok ? "saved" : "failed");
    };
    worker.postMessage(
      { type: "save", pages: [location.pathname, `${prefix}/programmes`, `${prefix}/admissions`], media: [...new Set(media)], assets: loadedAssets() },
      [channel.port2],
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${ready ? "" : "invisible"}`} aria-hidden={ready ? undefined : true}>
      <button
        type="button"
        onClick={save}
        disabled={!ready || state === "saving"}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 font-semibold text-fg hover:border-fg disabled:opacity-70 ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
          <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state === "saving" ? t("saving") : t("save")}
      </button>
      <p aria-live="polite" className="text-sm text-fg-muted">
        {state === "saved" ? t("saved") : state === "failed" ? t("saveFailed") : ""}
      </p>
    </div>
  );
}
