import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EnquiryForm } from "@/components/admissions/EnquiryForm";
import { colleges, programmes, site } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: `${t("admissionsTitle")} — SRMIST` };
}

export default async function AdmissionsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const nav = await getTranslations("Nav");
  const e = await getTranslations("Enquiry");
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

      <a
        href={site.admissions.applyUrl}
        data-magnetic
        className="relative mt-10 inline-flex overflow-hidden min-h-12 items-center rounded-full border-2 border-[var(--action-edge)] bg-action px-8 text-lg font-semibold text-on-action no-underline"
      >
        {nav("applyLong")}
        <span className="sr-only"> {nav("external")}</span>
      </a>

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
