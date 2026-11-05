import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SavedPages } from "@/components/ui/SavedPages";
import { getContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Offline" });
  return { title: `${t("title")} — SRMIST`, robots: { index: false } };
}

/**
 * Shown by the service worker when there's no connection and the page asked for isn't saved. Lists what this device
 * has saved, and the admissions phone numbers, which work without data. Not in the sitemap.
 */
export default async function OfflinePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Offline");
  const { site } = getContent(locale);

  return (
    <main id="main" tabIndex={-1} className="site-container max-w-3xl py-12 lg:py-20">
      <h1 className="font-display text-hero font-bold">{t("title")}</h1>
      <p className="mt-4 text-lg text-fg-muted">{t("intro")}</p>

      <h2 className="mt-12 font-display text-2xl font-bold">{t("savedTitle")}</h2>
      <div className="mt-4">
        <SavedPages />
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold">{t("callTitle")}</h2>
      <p className="mt-2 text-fg-muted">{t("callBody")}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {site.admissions.phones.map((p) => (
          <li key={p.tel}>
            <a href={`tel:${p.tel}`} className="inline-flex min-h-12 flex-col justify-center rounded-2xl border border-line px-5 py-2 text-fg no-underline">
              <span className="text-lg font-bold">{p.display}</span>
              <span className="text-sm text-fg-muted">{p.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
