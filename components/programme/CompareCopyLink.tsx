"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/** The address already holds the comparison, so sharing it (with a parent, say) is just copying the link. */
export function CompareCopyLink({ className = "" }: { className?: string }) {
  const t = useTranslations("Compare.ui");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(location.href)
      .then(() => {
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`needs-js ${className}`}
    >
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}
