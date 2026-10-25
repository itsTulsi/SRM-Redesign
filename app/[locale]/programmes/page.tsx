import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fact } from "@/components/ui/Todo";
import { getContent, type Campus, type Programme } from "@/lib/content";
import { Link } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: `${t("programmesTitle")} — SRMIST`, alternates: alternatesFor(locale, "/programmes") };
}

// Static, complete list (SSR, crawlable). The interactive finder with filters + Fuse search replaces the top of
// this page in a later step; these anchors (#level-ug, #level-pg, #<college>) stay stable for the nav.
export default async function ProgrammesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const { colleges, programmes, getCampus } = getContent(locale);
  const campusName = (slug: Campus["slug"]) => getCampus(slug)?.name ?? slug;
  const nav = await getTranslations("Nav");

  const ug = programmes.filter((p) => p.level === "UG");
  const pg = programmes.filter((p) => p.level === "PG");

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <h1 className="font-display text-hero font-bold">{t("programmesTitle")}</h1>
      <p className="mt-4 max-w-prose text-lg text-fg-muted">{t("programmesIntro")}</p>

      <section id="level-ug" aria-labelledby="h-ug" className="mt-14 scroll-mt-20">
        <h2 id="h-ug" className="font-display text-section font-bold">{nav("undergraduate")}</h2>
        {colleges.map((college) => {
          const list = ug.filter((p) => p.college === college.slug);
          if (list.length === 0) return null;
          return (
            <section key={college.slug} id={college.slug} aria-labelledby={`h-${college.slug}`} className="mt-10 scroll-mt-20">
              <h3 id={`h-${college.slug}`} className="text-xl font-semibold">
                {college.name}
              </h3>
              <ProgrammeList list={list} heading="h4" campusName={campusName} yearsLabel={(n) => t("years", { count: n })} />
            </section>
          );
        })}
      </section>

      <section id="level-pg" aria-labelledby="h-pg" className="mt-16 scroll-mt-20">
        <h2 id="h-pg" className="font-display text-section font-bold">{nav("postgraduate")}</h2>
        <ProgrammeList list={pg} heading="h3" campusName={campusName} yearsLabel={(n) => t("years", { count: n })} />
      </section>
    </main>
  );
}

function ProgrammeList({
  list,
  heading: Heading,
  campusName,
  yearsLabel,
}: {
  list: Programme[];
  heading: "h3" | "h4";
  campusName: (slug: Campus["slug"]) => string;
  yearsLabel: (n: number) => string;
}) {
  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => (
        <li
          key={p.slug}
          id={p.slug}
          className="flex flex-col gap-2 rounded-2xl border border-line-subtle p-5 target:border-link target:ring-2 target:ring-link"
        >
          <Heading className="font-semibold leading-snug">
            <Link href={`/programmes/${p.slug}`} className="text-fg underline-offset-4 hover:underline">
              {p.name}
            </Link>
          </Heading>
          <p className="text-fg-muted">{p.summary}</p>
          <p className="mt-auto text-sm text-fg-muted">
            <Fact value={p.durationYears} format={yearsLabel} /> ·{" "}
            {p.campuses.map(campusName).join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
