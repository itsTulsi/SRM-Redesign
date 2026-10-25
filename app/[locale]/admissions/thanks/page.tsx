import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { site } from "@/lib/content";
import { Link, type Locale } from "@/lib/i18n";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Enquiry" });
  return { title: `${t("thanksTitle")} — SRMIST`, robots: { index: false } };
}

// Landing page for the no-JavaScript enquiry form post (the enhanced form confirms in place).
export default async function EnquiryThanksPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Enquiry");
  const phone = site.admissions.phones[0]!;

  return (
    <main id="main" tabIndex={-1} className="site-container py-16 lg:py-24">
      <h1 className="font-display text-section font-bold">{t("thanksTitle")}</h1>
      <p className="mt-4 max-w-prose text-lg">
        {t("thanksBody")}{" "}
        <a href={`tel:${phone.tel}`} className="font-semibold whitespace-nowrap">
          {phone.display}
        </a>
      </p>
      <Link href="/admissions#enquiry" className="mt-8 inline-flex min-h-11 items-center font-semibold">
        {t("another")}
      </Link>
    </main>
  );
}
