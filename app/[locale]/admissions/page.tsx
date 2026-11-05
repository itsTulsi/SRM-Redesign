import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EnquiryForm } from "@/components/admissions/EnquiryForm";
import { GrailChapter, GrailHero, GrailPage } from "@/components/grail/GrailPage";
import { getContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return {
    title: `${t("admissionsTitle")} — SRMIST`,
    alternates: alternatesFor(locale, "/admissions"),
    ...socialFor(locale, { title: t("admissionsTitle"), description: t("admissionsIntro"), path: "/admissions" }),
  };
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
    <GrailPage>
      <GrailHero kicker={site.admissions.status} title={t("admissionsTitle")} lead={<p>{t("admissionsIntro")}</p>}>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {site.admissions.phones.map((phone) => (
            <li key={phone.id}>
              <a href={`tel:${phone.tel}`} className="grail-paper grail-paper-link flex min-h-11 flex-col gap-2 p-6 no-underline">
                <span className="text-fg-muted">{phone.label}</span>
                <span className="grail-num text-[clamp(1.9rem,3vw,2.6rem)] whitespace-nowrap">{phone.display}</span>
              </a>
            </li>
          ))}
        </ul>
      </GrailHero>

      {/* Every Apply button on the site lands here. SRM's portal sometimes answers "403 Forbidden" to ordinary
          browsers, so the way forward never depends on it alone. */}
      <GrailChapter id="apply" tone="lilac" kicker={nav("apply")} level={2} title={nav("applyLong")} titleId="apply-title" intro={<p>{t("applyIntro")}</p>}>
        <a href={site.admissions.applyUrl} rel="noreferrer" data-magnetic className="grail-cta grail-cta-ink relative overflow-hidden">
          {t("applyPortal")}
          <span className="sr-only"> {nav("external")}</span>
        </a>
        <div className="mt-10 max-w-2xl border-t border-[var(--line)] pt-6">
          <h3 className="font-semibold">{t("applyTroubleTitle")}</h3>
          <p className="mt-1">{t("applyTrouble")}</p>
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
        </div>
      </GrailChapter>

      <GrailChapter id="enquiry" tone="light" kicker={nav("enquiry")} level={3} title={e("title")} titleId="enquiry-title" intro={<p>{e("intro")}</p>}>
        <div className="max-w-3xl">
          <EnquiryForm programmes={programmeGroups} phone={site.admissions.phones[0]!} />
        </div>
      </GrailChapter>
    </GrailPage>
  );
}
