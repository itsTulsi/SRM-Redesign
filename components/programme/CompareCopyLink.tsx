"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/** The address already holds the comparison, so sharing it (with a parent, say) is just copying the link. */
export function CompareCopyLink({ className = "" }: { className?: string }) {
  const t = useTranslations("Compare.ui");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(location.href).then(() => setCopied(true));
      }}
      className={`needs-js ${className}`}
    >
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}
