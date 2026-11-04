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

const OG_LOCALE: Record<string, string> = { en: "en_IN", ta: "ta_IN", hi: "hi_IN" };

/**
 * Open Graph + X tags for link previews, in the page's own language. og:image needs NEXT_PUBLIC_SITE_URL set to the
 * real https address in production. Setting openGraph here drops the inherited site-wide image, so it's named
 * explicitly, except on pages with their own opengraph-image.tsx (ownImage): named images would replace those.
 */
export function socialFor(
  locale: string,
  {
    title,
    description,
    path,
    type = "website",
    ownImage = false,
  }: { title: string; description?: string; path: string; type?: "website" | "article"; ownImage?: boolean },
): Pick<Metadata, "openGraph" | "twitter"> {
  const url = `${locale === routing.defaultLocale ? "" : `/${locale}`}${path}` || "/";
  return {
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: "SRM Institute of Science and Technology",
      locale: OG_LOCALE[locale] ?? "en_IN",
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]!),
      ...(ownImage ? {} : { images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: "SRM Institute of Science and Technology" }] }),
    },
    twitter: { card: "summary_large_image", title, description, ...(ownImage ? {} : { images: [`/${locale}/twitter-image`] }) },
  };
}
