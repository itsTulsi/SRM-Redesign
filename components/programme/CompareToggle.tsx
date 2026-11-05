"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { MAX_COMPARE, parseCompare, readCompareSnapshot, serverCompareSnapshot, subscribeCompare, toggleCompare } from "@/lib/compare";

/** Pins a programme for comparison. A real toggle (aria-pressed); hidden without JavaScript, where /compare's form still works. */
export function CompareToggle({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const t = useTranslations("Compare.ui");
  const pinned = parseCompare(useSyncExternalStore(subscribeCompare, readCompareSnapshot, serverCompareSnapshot));
  const on = pinned.includes(slug);
  const full = !on && pinned.length >= MAX_COMPARE;

  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={full}
      title={full ? t("full") : undefined}
      onClick={() => toggleCompare(slug)}
      className={`needs-js inline-flex min-h-11 items-center gap-2 text-sm font-semibold disabled:opacity-60 ${className}`}
    >
      <span aria-hidden="true" className={`grid size-4 shrink-0 place-items-center rounded border border-current text-xs leading-none`}>
        {on ? "✓" : ""}
      </span>
      {t("add")}
      <span className="sr-only">: {name}</span>
    </button>
  );
}
