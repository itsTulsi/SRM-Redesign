import { safeJson } from "@/lib/jsonld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatFigure } from "@/components/acts/StatFigure";
import { Crest, ghostPill, GrailChapter, GrailHero, GrailPage, GrailStart } from "@/components/grail/GrailPage";
import { RecordView } from "@/components/programme/RecordView";
import { recommend } from "@/lib/recommend";
import { SectionNav } from "@/components/grail/SectionNav";
import { AskSenior, type SeniorThread } from "@/components/programme/AskSenior";
import { CompareToggle } from "@/components/programme/CompareToggle";
import { CostCalculator, type CostRoom } from "@/components/programme/CostCalculator";
import hostelData from "@/content/hostels.json";
import { SaveOffline } from "@/components/ui/SaveOffline";
import { ParentModeToggle } from "@/components/programme/ParentModeToggle";
import { getContent, isTodo, programmes } from "@/lib/content";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";
import { directionsUrl } from "@/lib/map";
import { programmeTitleName } from "@/lib/view-transition";

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
    ? {
        title: `${p.name} — SRMIST`,
        description: p.summary,
        alternates: alternatesFor(locale, `/programmes/${slug}`),
        ...socialFor(locale, { title: p.name, description: p.summary, path: `/programmes/${slug}`, ownImage: true }),
      }
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
  // "Programmes like this": matched on shared topics across colleges (free, on the server, nothing tracked).
  const recs = recommend(all, [p], 3);
  const related = recs.map((r) => r.item);
  const becauseOf = new Map(recs.map((r) => [r.item.slug, r.because]));
  const threads: SeniorThread[] = seniorsByCollege[p.college] ?? seniorsByCollege.default ?? [];
  const phones = site.admissions.phones.slice(0, 2);
  const ct = await getTranslations("Cost");
  // Hostel rows from SRM's 2026–27 circulars (content/hostels.json); Kattankulathur only.
  const rooms: CostRoom[] = (["men", "women"] as const).flatMap((group) =>
    hostelData.fees[group].map((r) => ({ group, block: r.block, ac: r.ac, sharing: r.sharing, hostel: r.hostel, mess: r.mess, offCampus: "offCampus" in r ? !!r.offCampus : undefined })),
  );
  const atKtr = p.campuses.includes("kattankulathur");
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

  const g = await getTranslations("Grail");
  const f = await getTranslations("Pages.finder");
  const sr = await getTranslations("Senior");

  return (
    <GrailPage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }} />

      <RecordView slug={p.slug} />
      <GrailHero
        kicker={`${college?.name ?? ""} · ${level}${duration ? ` · ${duration}` : ""}`}
        title={p.name}
        titleStyle={programmeTitleName(p.slug)}
        size="text-[clamp(2.3rem,6vw,5.75rem)]"
        before={
          <nav aria-label="Breadcrumb" className="mb-2 text-sm text-[var(--fg-muted)]">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/programmes" className="inline-flex min-h-11 items-center text-[var(--fg-muted)]">
                  {t("programmes")}
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href={`/programmes#${p.college}`} className="inline-flex min-h-11 items-center text-[var(--fg-muted)]">
                  {college?.shortName}
                </Link>
              </li>
            </ol>
          </nav>
        }
        lead={
          <>
            {p.officialName && p.officialName !== p.name ? (
              <p className="mb-3 text-base">
                {t("officialName")}:{" "}
                <span lang="en" className="font-semibold text-[var(--fg)]">
                  {p.officialName}
                </span>
              </p>
            ) : null}
            <p className="text-xl">{p.summary}</p>
          </>
        }
      >
        {/* A/B test "programme-cta" (lib/ab.ts): B leads with the cost calculator, then Apply. */}
        <div data-ab="programme-cta" data-ab-variant="b" className="mt-10 flex flex-wrap gap-3">
          <a href="#cost" className="grail-cta">
            {ct("jump")}
          </a>
          <Link href="/admissions#apply" data-ab-goal="programme-cta" className={ghostPill}>
            {t("apply")}
          </Link>
          <Link href={`/admissions?programme=${p.slug}#enquiry`} data-ab-goal="programme-cta" className={ghostPill}>
            {t("enquire")}
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-3 [[data-ab-programme-cta=b]_&]:mt-3">
          <Link href="/admissions#apply" data-magnetic data-ab="programme-cta" data-ab-variant="a" data-ab-goal="programme-cta" className="grail-cta relative overflow-hidden">
            {t("apply")}
          </Link>
          <Link href={`/admissions?programme=${p.slug}#enquiry`} data-ab="programme-cta" data-ab-variant="a" data-ab-goal="programme-cta" className={ghostPill}>
            {t("enquire")}
          </Link>
          <a href={`tel:${phones[0]!.tel}`} className={ghostPill}>
            {t("call")}: {phones[0]!.display}
          </a>
          <CompareToggle slug={p.slug} name={p.name} className="rounded-full border border-[var(--line)] px-6 text-base text-[var(--fg)] hover:border-[var(--fg)]" />
          <SaveOffline />
        </div>
        {/* At a glance: the four facts most people came for, above the fold. */}
        <dl aria-label={f("glance")} className="mt-10 grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: t("level"), value: level },
            { label: t("duration"), value: duration },
            { label: t("fees"), value: fees },
            { label: t("campus"), value: campusList.map((c) => c.name).join(", ") },
          ].map((r) => (
            <div key={r.label} className="flex min-w-0 flex-col-reverse gap-1 rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur">
              <dt className="text-xs font-semibold tracking-wide text-[var(--fg-muted)] uppercase">{r.label}</dt>
              <dd className={r.value ? "grail-num text-[clamp(1.05rem,2.2vw,1.9rem)] break-words hyphens-auto" : "text-[var(--fg-muted)]"}>{r.value ?? t("notPublished")}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 max-w-4xl">
          <ParentModeToggle variant="banner" />
        </div>
      </GrailHero>

      {/* ── Parent view: plain answers first (shown when <html data-parent="on">) ── */}
      <GrailChapter tone="light" className="parent-view" kicker={pt("title")} level={2} title={pt("title")} titleId="parent-title" intro={<p>{pt("intro")}</p>}>
        <dl className="grid max-w-5xl gap-4 md:grid-cols-2">
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
            {
              q: pt("costQ"),
              a: (
                <p>
                  {fees ?? pt("costUnknown")}{" "}
                  <a href="#cost" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                    {ct("jump")} →
                  </a>
                </p>
              ),
            },
            {
              q: pt("admitQ"),
              a: <p>{[entrance, eligibility].filter(Boolean).join(" · ") || t("notPublished")}</p>,
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
                      <Link href={site.parentLinks.antiRagging} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("antiRagging")}
                      </Link>
                    </li>
                    <li>
                      <Link href={site.parentLinks.hostels} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("hostels")}
                      </Link>
                    </li>
                    <li>
                      <Link href={site.parentLinks.campusSafety} className="inline-flex min-h-11 items-center font-semibold">
                        {pt("safety")}
                      </Link>
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
            <div key={item.q} className="grail-paper p-6">
              <dt className="text-xl font-semibold">{item.q}</dt>
              <dd className="mt-2 text-lg">{item.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 max-w-5xl rounded-[28px] bg-[#000000] p-6 text-[#ffffff] lg:p-8">
          <h3 className="grail-num text-3xl uppercase">{pt("callTitle")}</h3>
          <p className="mt-2 mb-5 text-[#b8b8b8]">{pt("callBody")}</p>
          {callButtons}
        </div>
      </GrailChapter>

      {/* ── What will it cost? Shown in both views: tuition + hostel + mess for the whole course, SRM's figures only. ── */}
      <GrailChapter id="cost" className="scroll-mt-24" tone="lilac" kicker={ct("kicker")} level={2} title={ct("title")} titleId="cost-title" intro={<p>{ct("intro")}</p>} size="text-[clamp(2.4rem,6vw,5.5rem)]">
        <CostCalculator
          tuition={typeof p.feesPerYearINR === "number" ? p.feesPerYearINR : null}
          years={typeof p.durationYears === "number" ? p.durationYears : 0}
          rooms={rooms}
          laundry={hostelData.fees.laundry}
          hostelCampus={atKtr ? null : campusList.map((c) => c.name).join(", ")}
          btechRates={p.slug.startsWith("btech") || p.slug.startsWith("mtech")}
          phone={{ display: phones[0]!.display, tel: phones[0]!.tel }}
        />
        <p className="mt-6 text-sm">
          <a href={hostelData.fees.sources.men} className="inline-flex min-h-11 items-center underline underline-offset-4">
            {ct("sources")}
          </a>
        </p>
      </GrailChapter>

      {/* ── Student view ── */}
      <div className="student-view">
        <SectionNav
          label={f("onPage")}
          items={[
            { id: "facts", label: t("keyFacts") },
            { id: "careers", label: t("careers") },
            { id: "placements", label: f("placements") },
            { id: "senior", label: sr("title") },
            ...(related.length ? [{ id: "related", label: f("related") }] : []),
          ]}
        />
        <GrailChapter id="facts" className="scroll-mt-32" tone="light" kicker={college?.shortName ?? ""} level={3} title={t("keyFacts")} titleId="facts-title">
          <dl className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {factRows.map((r) => (
              <div key={r.label} className="grail-paper flex flex-col gap-1 p-5">
                <dt className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{r.label}</dt>
                <dd className={`text-lg ${r.value ? "font-semibold" : "text-fg-muted"}`}>{r.value ?? t("notPublished")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-[var(--fg-muted)]">
            {t("sources")}:{" "}
            {p.sources.map((s, i) => (
              <span key={s}>
                {i > 0 ? " · " : ""}
                <a href={s} className="inline-flex min-h-11 items-center">{new URL(s).hostname.replace(/^www\./, "")}</a>
              </span>
            ))}
          </p>
        </GrailChapter>

        <GrailChapter id="careers" className="scroll-mt-32" kicker={t("careers")} level={4} title={t("careers")} titleId="careers-title" intro={<p>{t("careersNote")}</p>}>
          <ul className="flex flex-wrap gap-3">
            {p.outcomes.map((o, i) => (
              <li key={o} className="grail-paper flex items-center gap-3 rounded-full py-2 pr-5 pl-2 text-lg font-semibold">
                <Crest seed={o + i} className="size-9" />
                {o}
              </li>
            ))}
          </ul>
        </GrailChapter>

        <GrailChapter
          id="placements"
          className="scroll-mt-32"
          tone="lilac"
          kicker={g("proof.kicker")}
          level={5}
          title={t("placementsTitle", { season: placements.season })}
          titleId="placements-title"
          intro={<p>{t("placementsNote")}</p>}
          size="text-[clamp(2.2rem,5.5vw,5rem)]"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
            {placements.items.map((s) => (
              <StatFigure key={s.id} stat={s} size="md" />
            ))}
          </dl>
        </GrailChapter>

        <div id="senior" data-tone="light" className="grail-sheet relative scroll-mt-32">
          <div className="site-container max-w-5xl py-16 lg:py-24">
            <AskSenior programmeSlug={p.slug} threads={threads} />
          </div>
        </div>

        {related.length ? (
          <GrailChapter id="related" className="scroll-mt-32" kicker={college?.shortName ?? ""} level={6} title={f("similar")} titleId="related-title" intro={<p>{f("similarWhy")}</p>} size="text-[clamp(2rem,5vw,4.5rem)]">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/programmes/${r.slug}`} className="grail-paper grail-paper-link flex h-full min-h-11 flex-col gap-1 p-5 text-fg no-underline">
                    <span style={programmeTitleName(r.slug)} className="block text-lg font-semibold">
                      {r.name}
                    </span>
                    <span className="text-sm text-fg-muted">{r.summary}</span>
                    <span className="mt-2 text-xs font-semibold text-tree">{f("because", { tags: (becauseOf.get(r.slug) ?? []).join(", ") })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </GrailChapter>
        ) : null}
      </div>

      <GrailStart level={related.length ? 7 : 6} />
    </GrailPage>
  );
}
