"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { readParentMode, setParentMode, subscribeParentMode } from "@/lib/parent-mode";

/** A real toggle button (aria-pressed). Server render assumes "off"; the live state follows immediately. */
export function ParentModeToggle({ variant = "pill" }: { variant?: "pill" | "banner" }) {
  const t = useTranslations("Parent");
  const on = useSyncExternalStore(subscribeParentMode, readParentMode, () => false);

  const button = (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setParentMode(!on)}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-semibold ${
        on ? "border-action bg-action text-on-action" : "border-line text-fg"
      }`}
    >
      <span aria-hidden="true" className={`size-3 rounded-full border border-current ${on ? "bg-ink" : ""}`} />
      {t("toggle")}
    </button>
  );

  if (variant === "pill") return button;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
      <p>{on ? t("onHint") : t("offHint")}</p>
      {button}
    </div>
  );
}
