"use client";

import { useLocale } from "next-intl";
import { Link, localeNames, locales, usePathname, type Locale } from "@/lib/i18n";

const shortNames: Record<Locale, string> = { en: "EN", ta: "த", hi: "हि" };

export function LanguageSwitcher({
  label,
  compact = false,
  className = "",
}: {
  label: string;
  /** Header variant: short script codes, full name kept for screen readers. */
  compact?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-1">
        {locales.map((l) => {
          const current = l === locale;
          return (
            <li key={l}>
              <Link
                href={pathname}
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
    </nav>
  );
}
