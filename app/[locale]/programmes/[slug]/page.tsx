import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatFigure } from "@/components/acts/StatFigure";
import { AskSenior, type SeniorThread } from "@/components/programme/AskSenior";
import { ParentModeToggle } from "@/components/programme/ParentModeToggle";
import { getContent, isTodo, programmes } from "@/lib/content";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";
import { directionsUrl } from "@/lib/map";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const inr = new Intl.NumberFormat("en-IN");

export function generateStaticParams() {
  return programmes.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getContent(locale).getProgramme(slug);
  return p
    ? { title: `${p.name} — SRMIST`, description: p.summary, alternates: alternatesFor(locale, `/programmes/${slug}`) }
    : {};
}

/** ISO 8601 duration for schema.org (5.5 → P5Y6M). */
const isoYears = (y: number) => `P${Math.floor(y)}Y${y % 1 ? `${Math.round((y % 1) * 12)}M` : ""}`;

export default async function ProgrammePage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { getProgramme, getCollege, getCampus, placements, programmes: all, site, seniorsByCollege } = getContent(locale);
  const p = getProgramme(slug);
  if (!p) notFound();

  const t = await getTranslations("Programme");
  const pt = await getTranslations("Parent");
  const college = getCollege(p.college);
  const campusList = p.campuses.map((c) => getCampus(c)!).filter(Boolean);
  const related = all.filter((x) => x.college === p.college && x.slug !== p.slug);
  const threads: SeniorThread[] = seniorsByCollege[p.college] ?? seniorsByCollege.default ?? [];
  const phones = site.admissions.phones.slice(0, 2);
  const level = p.level === "UG" ? t("ug") : t("pg");
  const duration = typeof p.durationYears === "number" ? t("years", { count: p.durationYears }) : null;
  const fees = typeof p.feesPerYearINR === "number" ? t("feesValue", { amount: inr.format(p.feesPerYearINR) }) : null;
  const eligibility = isTodo(p.eligibility) ? null : p.eligibility;
  const entrance = isTodo(p.entrance) ? null : p.entrance;
  const deadline = isTodo(p.deadline) ? null : p.deadline;
  const stat = (id: string) => placements.items.find((s) => s.id === id);

  // schema.org: only verified fields — a missing value is omitted, never guessed.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: p.officialName ?? p.name,
    ...(p.officialName && p.officialName !== p.name ? { alternateName: p.name } : {}),
    description: p.summary,
    url: `${siteUrl}${locale === "en" ? "" : `/${locale}`}/programmes/${p.slug}`,
    provider: { "@type": "CollegeOrUniversity", name: site.name, url: "https://www.srmist.edu.in/" },
    ...(typeof p.durationYears === "number" ? { timeToComplete: isoYears(p.durationYears) } : {}),
    ...(eligibility ? { programPrerequisites: eligibility } : {}),
    // schema.org wants a date here; prose like "Last date for 2026 entry was …" is shown on the page only.
    ...(deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? { applicationDeadline: deadline } : {}),
    ...(typeof p.feesPerYearINR === "number"
      ? { offers: { "@type": "Offer", price: p.feesPerYearINR, priceCurrency: "INR", category: "Tuition per year" } }
      : {}),
  };

  const callButtons = (
    <ul className="flex flex-wrap gap-3">
      {phones.map((ph) => (
        <li key={ph.tel}>
          <a
            href={`tel:${ph.tel}`}
            className="inline-flex min-h-12 flex-col justify-center rounded-2xl bg-action px-5 py-2 text-on-action no-underline"
          >
            <span className="text-lg font-bold">{ph.display}</span>
            <span className="text-xs">{ph.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );

  const factRows = [
    { label: t("level"), value: level },
    { label: t("duration"), value: duration },
    { label: t("campus"), value: campusList.map((c) => c.name).join(", ") },
    { label: t("entrance"), value: entrance },
    { label: t("eligibility"), value: eligibility },
    { label: t("fees"), value: fees },
    { label: t("deadline"), value: deadline },
  ];

  return (
    <main id="main" tabIndex={-1} className="site-container py-10 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-fg-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/programmes" className="inline-flex min-h-11 items-center">
              {t("programmes")}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={`/programmes#${p.college}`} className="inline-flex min-h-11 items-center">
              {college?.shortName}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mt-2 max-w-4xl">
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
          {college?.name} · {level}
          {duration ? ` · ${duration}` : ""}
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,4rem)] leading-[1.05] font-bold text-balance">{p.name}</h1>
        {p.officialName && p.officialName !== p.name ? (
          <p className="mt-2 text-fg-muted">
            {t("officialName")}:{" "}
            <span lang="en" className="font-semibold text-fg">
              {p.officialName}
            </span>
          </p>
        ) : null}
        <p className="mt-4 text-xl text-fg-muted">{p.summary}</p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admissions#apply"
          data-magnetic
          className="relative inline-flex min-h-12 items-center overflow-hidden rounded-full bg-action px-6 font-semibold text-on-action no-underline"
        >
          {t("apply")}
        </Link>
        <Link
          href={`/admissions?programme=${p.slug}#enquiry`}
          className="inline-flex min-h-12 items-center rounded-full border border-line px-6 font-semibold text-fg no-underline hover:border-fg"
        >
          {t("enquire")}
        </Link>
        <a
          href={`tel:${phones[0]!.tel}`}
          className="inline-flex min-h-12 items-center rounded-full border border-line px-6 font-semibold text-fg no-underline hover:border-fg"
        >
          {t("call")}: {phones[0]!.display}
        </a>
      </div>

      <div className="mt-8 max-w-4xl">
        <ParentModeToggle variant="banner" />
      </div>

      {/* ── Parent view: plain answers first (shown when <html data-parent="on">) ── */}
      <section aria-labelledby="parent-title" className="parent-view mt-12 max-w-4xl">
        <h2 id="parent-title" className="font-display text-section font-bold">
          {pt("title")}
        </h2>
        <p className="mt-3 max-w-prose text-fg-muted">{pt("intro")}</p>
        <dl className="mt-8 flex flex-col gap-4">
          {[
            {
              q: pt("studyQ"),
              a: (
                <p>
                  {p.summary} {level}
                  {duration ? `, ${duration}` : ""} — {college?.name}.
                </p>
              ),
            },
            { q: pt("costQ"), a: <p>{fees ?? pt("costUnknown")}</p> },
            {
              q: pt("admitQ"),
              a: (
                <p>
                  {[entrance, eligibility].filter(Boolean).join(" · ") || t("notPublished")}
                </p>
              ),
            },
            {
              q: pt("whereQ"),
              a: (
                <ul className="flex flex-col gap-2">
                  {campusList.map((c) => (
                    <li key={c.slug}>
                      <span className="font-semibold">{c.name}</span> —{" "}
                      {isTodo(c.address) ? `${c.city}, ${c.state}` : <span lang="en">{c.address}</span>}{" "}
                      <a href={directionsUrl(c)} className="font-semibold whitespace-nowrap">
                        {pt("directions")}
                      </a>
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              q: pt("safeQ"),
              a: (
                <>
                  <p>{pt("safeA")}</p>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    <li>
                      <a href={site.parentLinks.antiRagging} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("antiRagging")}
                      </a>
                    </li>
                    <li>
                      <Link href={site.parentLinks.hostels} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("hostels")}
                      </Link>
                    </li>
                    <li>
                      <a href={site.parentLinks.campusSafety} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("safety")}
                      </a>
                    </li>
                  </ul>
                </>
              ),
            },
            {
              q: pt("jobsQ"),
              a: (
                <p>
                  {pt("jobsA", {
                    roles: p.outcomes.join(", "),
                    season: placements.season,
                    offers: stat("offers")?.display ?? "—",
                    avg: stat("average-ctc")?.display ?? "—",
                  })}
                </p>
              ),
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-line-subtle p-5">
              <dt className="font-display text-xl font-bold">{item.q}</dt>
              <dd className="mt-2 text-lg">{item.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 rounded-3xl border border-line p-6">
          <h3 className="font-display text-2xl font-bold">{pt("callTitle")}</h3>
          <p className="mt-2 mb-4 text-fg-muted">{pt("callBody")}</p>
          {callButtons}
        </div>
      </section>

      {/* ── Student view ── */}
      <div className="student-view mt-12 flex flex-col gap-16">
        <section aria-labelledby="facts-title" className="max-w-4xl">
          <h2 id="facts-title" className="font-display text-section font-bold">
            {t("keyFacts")}
          </h2>
          <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-line-subtle pt-6 sm:grid-cols-[max-content_1fr]">
            {factRows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="font-semibold">{r.label}</dt>
                <dd className={r.value ? "" : "text-fg-muted"}>{r.value ?? t("notPublished")}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="careers-title" className="max-w-4xl">
          <h2 id="careers-title" className="font-display text-section font-bold">
            {t("careers")}
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {p.outcomes.map((o) => (
              <li key={o} className="rounded-full border border-line px-4 py-2">
                {o}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-fg-muted">{t("careersNote")}</p>
        </section>

        <section aria-labelledby="placements-title">
          <h2 id="placements-title" className="font-display text-section font-bold">
            {t("placementsTitle", { season: placements.season })}
          </h2>
          <p className="mt-3 text-fg-muted">{t("placementsNote")}</p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
            {placements.items.map((s) => (
              <StatFigure key={s.id} stat={s} size="md" />
            ))}
          </dl>
        </section>

        <div className="max-w-4xl">
          <AskSenior programmeSlug={p.slug} threads={threads} />
        </div>

        {related.length ? (
          <section aria-labelledby="related-title">
            <h2 id="related-title" className="font-display text-2xl font-bold">
              {t("related", { college: college?.shortName ?? "" })}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/programmes/${r.slug}`}
                    className="flex h-full min-h-11 flex-col gap-1 rounded-2xl border border-line-subtle p-4 text-fg no-underline hover:border-line"
                  >
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-sm text-fg-muted">{r.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-sm text-fg-muted">
          {t("sources")}:{" "}
          {p.sources.map((s, i) => (
            <span key={s}>
              {i > 0 ? " · " : ""}
              <a href={s}>{new URL(s).hostname.replace(/^www\./, "")}</a>
            </span>
          ))}
        </p>
      </div>
    </main>
  );
}
