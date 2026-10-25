import type { Metadata } from "next";
import { routing } from "./i18n";

/** Per-page canonical + hreflang alternates (a canonical must point at the page itself, never the homepage). */
export function alternatesFor(locale: string, path: string): Metadata["alternates"] {
  const href = (l: string) => `${l === routing.defaultLocale ? "" : `/${l}`}${path}` || "/";
  return {
    canonical: href(locale),
    languages: { ...Object.fromEntries(routing.locales.map((l) => [l, href(l)])), "x-default": href(routing.defaultLocale) },
  };
}
