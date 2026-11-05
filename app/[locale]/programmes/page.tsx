import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareToggle } from "@/components/programme/CompareToggle";
import { Crest, ghostPill, GrailChapter, GrailHero, GrailPage, GrailStart } from "@/components/grail/GrailPage";
import { Fact } from "@/components/ui/Todo";
import { getContent, type Campus, type Programme } from "@/lib/content";
import { Link } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";
import { programmeTitleName } from "@/lib/view-transition";

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
  const { colleges, programmes, getCampus } = getContent(locale);
  const campusName = (slug: Campus["slug"]) => getCampus(slug)?.name ?? slug;
  const nav = await getTranslations("Nav");

  const ug = programmes.filter((p) => p.level === "UG");
  const pg = programmes.filter((p) => p.level === "PG");

  const level = await getTranslations("Grail");
  const pillClass =
    "inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 text-sm font-semibold text-[var(--fg)] no-underline hover:border-[var(--fg)]";

  return (
    <GrailPage>
      <GrailHero kicker={nav("study")} title={t("programmesTitle")} lead={<p>{t("programmesIntro")}</p>}>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/admissions#apply" className="grail-cta">
            {level("start.apply")}
          </Link>
          <Link href="/compare" className={ghostPill}>
            {nav("compare")}
          </Link>
        </div>
        {/* Jump straight to a level or a college. */}
        <ul className="mt-12 flex flex-wrap gap-2">
          {[
            { href: "#level-ug", label: nav("undergraduate") },
            { href: "#level-pg", label: nav("postgraduate") },
            ...colleges.filter((c) => ug.some((p) => p.college === c.slug)).map((c) => ({ href: `#${c.slug}`, label: c.shortName })),
          ].map((l) => (
            <li key={l.href}>
              <a href={l.href} className={pillClass}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </GrailHero>

      <GrailChapter id="level-ug" tone="light" kicker={nav("study")} level={2} title={nav("undergraduate")} titleId="h-ug">
        <div className="flex flex-col gap-14">
          {colleges.map((college) => {
            const list = ug.filter((p) => p.college === college.slug);
            if (list.length === 0) return null;
            return (
              <section key={college.slug} id={college.slug} aria-labelledby={`h-${college.slug}`} className="scroll-mt-20">
                <div className="flex items-center gap-4 border-t border-[var(--line-subtle)] pt-6">
                  <Crest seed={college.slug} className="size-12" />
                  <h3 id={`h-${college.slug}`} className="text-2xl font-semibold">
                    {college.name}
                  </h3>
                </div>
                <ProgrammeList list={list} heading="h4" campusName={campusName} yearsLabel={(n) => t("years", { count: n })} />
              </section>
            );
          })}
        </div>
      </GrailChapter>

      <GrailChapter id="level-pg" kicker={nav("study")} level={3} title={nav("postgraduate")} titleId="h-pg" className="z-[1]">
        <ProgrammeList list={pg} heading="h3" campusName={campusName} yearsLabel={(n) => t("years", { count: n })} />
      </GrailChapter>

      <GrailStart level={4} />
    </GrailPage>
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
    <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => (
        <li
          key={p.slug}
          id={p.slug}
          className="grail-paper grail-paper-link relative flex flex-col gap-2 p-6 target:ring-4 target:ring-[var(--focus)]"
        >
          <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
            <Fact value={p.durationYears} format={yearsLabel} />
          </p>
          <Heading style={programmeTitleName(p.slug)} className="text-xl font-semibold leading-snug">
            <Link href={`/programmes/${p.slug}`} className="text-fg underline-offset-4 hover:underline">
              {p.name}
            </Link>
          </Heading>
          <p className="text-fg-muted">{p.summary}</p>
          <p className="mt-auto pt-2 text-sm text-fg-muted">{p.campuses.map(campusName).join(", ")}</p>
          <CompareToggle slug={p.slug} name={p.name} className="self-start text-fg" />
        </li>
      ))}
    </ul>
  );
}
