"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Link, localeNames, locales, usePathname, type Locale } from "@/lib/i18n";

const shortNames: Record<Locale, string> = { en: "EN", ta: "த", hi: "हि" };

export function LanguageSwitcher({
  label,
  compact = false,
  landmark = true,
  className = "",
}: {
  label: string;
  /** Header variant: short script codes, full name kept for screen readers. */
  compact?: boolean;
  /** false = a labelled group instead of a <nav>, for second copies (footer) so landmarks stay unique. */
  landmark?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  const targetHref = search ? `${pathname}${search}` : pathname;
  const Wrapper = landmark ? "nav" : "div";
  return (
    <Wrapper aria-label={label} role={landmark ? undefined : "group"} className={className}>
      <ul className="flex items-center gap-1">
        {locales.map((l) => {
          const current = l === locale;
          return (
            <li key={l}>
              <Link
                href={targetHref}
                locale={l}
                lang={l}
                hrefLang={l}
                aria-current={current ? "true" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm no-underline ${
                  current ? "bg-fg font-semibold text-bg" : "text-fg hover:bg-line-subtle"
                }`}
              >
                {compact ? (
                  <>
                    <span aria-hidden="true">{shortNames[l]}</span>
                    <span className="sr-only">{localeNames[l]}</span>
                  </>
                ) : (
                  localeNames[l]
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Wrapper>
  );
}
