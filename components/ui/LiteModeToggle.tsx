"use client";

import { useTranslations } from "next-intl";
import { setLiteOverride } from "@/lib/lite-mode";
import { useLiteMode } from "./use-lite-mode";

export function LiteModeToggle() {
  const t = useTranslations("Lite");
  const { lite, reason } = useLiteMode();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={lite}
        onClick={() => setLiteOverride(lite ? "off" : "on")}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 font-medium"
      >
        <span
          aria-hidden="true"
          className={`size-3 rounded-full border border-current ${lite ? "bg-tree" : "bg-transparent"}`}
        />
        {t("label")}
      </button>
      <p className="text-sm text-fg-muted" aria-live="polite">
        {lite ? t("on") : t("off")} {reason ? t(`reason.${reason}`) : null}
      </p>
    </div>
  );
}
