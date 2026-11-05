import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProgrammeExplorer, type ExplorerCard } from "@/components/programme/ProgrammeExplorer";
import { ghostPill, GrailChapter, GrailHero, GrailPage, GrailStart } from "@/components/grail/GrailPage";
import { getContent, type Campus } from "@/lib/content";
import { Link } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pages" });
  return {
    title: `${t("programmesTitle")} — SRMIST`,
    alternates: alternatesFor(locale, "/programmes"),
    ...socialFor(locale, { title: t("programmesTitle"), description: t("programmesIntro"), path: "/programmes" }),
  };
}

// Static, complete list (SSR, crawlable). The interactive finder with filters + Fuse search replaces the top of
// this page in a later step; these anchors (#level-ug, #level-pg, #<college>) stay stable for the nav.
export default async function ProgrammesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const f = await getTranslations("Pages.finder");
  const g = await getTranslations("Grail");
  const nav = await getTranslations("Nav");
  const { colleges, programmes, campuses, getCampus } = getContent(locale);
  const campusName = (slug: Campus["slug"]) => getCampus(slug)?.name ?? slug;
  const inr = new Intl.NumberFormat("en-IN");

  // Everything the finder needs, slimmed down; numbers that SRM hasn't published stay null and are simply not shown.
  const cards: ExplorerCard[] = programmes.map((p) => ({
    slug: p.slug,
    name: p.name,
    alt: p.officialName ?? p.name,
    summary: p.summary,
    college: p.college,
    level: p.level,
    duration: typeof p.durationYears === "number" ? t("years", { count: p.durationYears }) : null,
    campuses: p.campuses.map(campusName).join(", "),
    fee: typeof p.feesPerYearINR === "number" ? f("perYear", { amount: inr.format(p.feesPerYearINR) }) : null,
    tags: p.tags,
  }));
  const used = colleges.filter((c) => programmes.some((p) => p.college === c.slug));
  const stats = [
    { n: programmes.length, label: t("programmesTitle") },
    { n: used.length, label: f("colleges") },
    { n: campuses.filter((c) => c.kind === "campus").length, label: nav("ourCampuses") },
  ];

  return (
    <GrailPage>
      <GrailHero kicker={nav("study")} title={t("programmesTitle")} lead={<p>{t("programmesIntro")}</p>}>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#find" className="grail-cta">
            {f("search")}
          </a>
          <Link href="/compare" className={ghostPill}>
            {nav("compare")}
          </Link>
        </div>
        {/* The size of the choice, counted from the content, never typed in. */}
        <dl className="mt-14 grid max-w-3xl grid-cols-3 gap-4 border-t border-[var(--line)] pt-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-[var(--fg-muted)]">{s.label}</dt>
              <dd className="grail-num text-[clamp(2.6rem,6vw,4.5rem)]">{s.n}</dd>
            </div>
          ))}
        </dl>
      </GrailHero>

      <GrailChapter id="find" tone="light" kicker={nav("study")} level={2} title={g("start.findTitle")} titleId="find-title" size="text-[clamp(2.2rem,6vw,5.5rem)]">
        <ProgrammeExplorer
          cards={cards}
          colleges={used.map((c) => ({ slug: c.slug, name: c.shortName }))}
          strings={{
            search: f("search"),
            placeholder: f("placeholder"),
            all: f("all"),
            ug: nav("undergraduate"),
            pg: nav("postgraduate"),
            colleges: f("colleges"),
            showing: f.raw("showing") as string,
            none: f("none"),
            clear: f("clear"),
            view: f("view"),
          }}
        />
      </GrailChapter>

      <GrailStart level={3} />
    </GrailPage>
  );
}
