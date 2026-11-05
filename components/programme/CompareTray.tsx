"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { clearCompare, compareHref, MAX_COMPARE, parseCompare, readCompareSnapshot, serverCompareSnapshot, subscribeCompare } from "@/lib/compare";
import { Link, usePathname } from "@/lib/i18n";

/** Appears once a programme is pinned. Sits clear of Ask SRM (bottom right) and the Living Tree (bottom left). */
export function CompareTray() {
  const t = useTranslations("Compare.ui");
  const pathname = usePathname();
  const pinned = parseCompare(useSyncExternalStore(subscribeCompare, readCompareSnapshot, serverCompareSnapshot));
  if (pinned.length === 0 || pathname === "/compare") return null;

  return (
    <aside
      aria-label={t("trayLabel")}
      className="compare-tray fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-line bg-bg py-1 pr-1 pl-4 shadow-2xl max-sm:right-20 sm:left-1/2"
    >
      <p aria-live="polite" className="min-w-0 flex-1 text-sm whitespace-nowrap">
        {t("count", { count: pinned.length, max: MAX_COMPARE })}
      </p>
      <button type="button" onClick={clearCompare} className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4 max-sm:hidden">
        {t("clear")}
      </button>
      <Link
        href={compareHref(pinned)}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-action px-4 text-sm font-semibold text-on-action no-underline"
      >
        {t("go")}
      </Link>
    </aside>
  );
}
