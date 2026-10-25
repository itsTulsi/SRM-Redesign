import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EnquiryForm } from "@/components/admissions/EnquiryForm";
import { getContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: `${t("admissionsTitle")} — SRMIST`, alternates: alternatesFor(locale, "/admissions") };
}

export default async function AdmissionsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const nav = await getTranslations("Nav");
  const e = await getTranslations("Enquiry");
  const { colleges, programmes, site } = getContent(locale);
  const programmeGroups = colleges
    .map((c) => ({ college: c.name, items: programmes.filter((p) => p.college === c.slug).map((p) => ({ slug: p.slug, name: p.name })) }))
    .filter((g) => g.items.length > 0);

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{site.admissions.status}</p>
      <h1 className="mt-2 font-display text-hero font-bold">{t("admissionsTitle")}</h1>
      <p className="mt-4 max-w-prose text-lg text-fg-muted">{t("admissionsIntro")}</p>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {site.admissions.phones.map((phone) => (
          <li key={phone.id}>
            <a
              href={`tel:${phone.tel}`}
              className="flex min-h-11 flex-col gap-1 rounded-2xl border border-line p-6 text-fg no-underline hover:border-fg"
            >
              <span className="text-fg-muted">{phone.label}</span>
              <span className="font-display text-2xl font-bold">{phone.display}</span>
            </a>
          </li>
        ))}
      </ul>

      {/* Every Apply button on the site lands here. SRM's portal sometimes answers "403 Forbidden" to ordinary
          browsers, so the way forward never depends on it alone. */}
      <section id="apply" aria-labelledby="apply-title" className="mt-12 max-w-3xl scroll-mt-20 rounded-3xl border border-line p-6 lg:p-8">
        <h2 id="apply-title" className="font-display text-section font-bold">
          {nav("applyLong")}
        </h2>
        <p className="mt-3 text-lg text-fg-muted">{t("applyIntro")}</p>
        <a
          href={site.admissions.applyUrl}
          rel="noreferrer"
          data-magnetic
          className="relative mt-6 inline-flex min-h-12 items-center overflow-hidden rounded-full border-2 border-[var(--action-edge)] bg-action px-8 text-lg font-semibold text-on-action no-underline"
        >
          {t("applyPortal")}
          <span className="sr-only"> {nav("external")}</span>
        </a>
        <h3 className="mt-8 font-semibold">{t("applyTroubleTitle")}</h3>
        <p className="mt-1 text-fg-muted">{t("applyTrouble")}</p>
        <ul className="mt-2 flex flex-wrap gap-x-6">
          <li>
            <a href={site.admissions.officialAdmissionsUrl} className="inline-flex min-h-11 items-center font-semibold">
              {t("officialAdmissions")}
              <span className="sr-only"> {nav("external")}</span>
            </a>
          </li>
          <li>
            <a href="#enquiry" className="inline-flex min-h-11 items-center font-semibold">
              {nav("enquiry")}
            </a>
          </li>
        </ul>
      </section>

      <section id="enquiry" aria-labelledby="enquiry-title" className="mt-20 max-w-3xl scroll-mt-20">
        <h2 id="enquiry-title" className="font-display text-section font-bold">
          {e("title")}
        </h2>
        <p className="mt-3 mb-8 text-lg text-fg-muted">{e("intro")}</p>
        <EnquiryForm programmes={programmeGroups} phone={site.admissions.phones[0]!} />
      </section>
    </main>
  );
}
