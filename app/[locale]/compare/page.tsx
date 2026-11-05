import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GrailHero, GrailPage, GrailStart } from "@/components/grail/GrailPage";
import { CompareCopyLink } from "@/components/programme/CompareCopyLink";
import { compareHref, MAX_COMPARE } from "@/lib/compare";
import { getContent, isTodo } from "@/lib/content";
import { getPathname, Link, type Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ p?: string | string[]; diff?: string }>;
};

const inr = new Intl.NumberFormat("en-IN");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Compare" });
  return {
    title: `${t("metaTitle")} — SRMIST`,
    description: t("intro"),
    alternates: alternatesFor(locale, "/compare"),
    ...socialFor(locale, { title: t("metaTitle"), description: t("intro"), path: "/compare" }),
  };
}

/**
 * Side-by-side comparison, rendered on the server from the address (/compare?p=a&p=b): every comparison is a shareable
 * link, and the form works without JavaScript. Facts come straight from programmes.json; a missing one says so.
 */
export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations("Compare");
  const pt = await getTranslations("Programme");
  const nav = await getTranslations("Nav");
  const { colleges, getCampus, getCollege, getProgramme, programmes } = getContent(locale);

  const slugs = [...new Set([query.p ?? []].flat())];
  const chosen = slugs.flatMap((s) => getProgramme(s) ?? []).slice(0, MAX_COMPARE);
  const chosenSlugs = chosen.map((p) => p.slug);
  const onlyDiff = query.diff === "1";

  // Rows hold plain strings so "is this row the same for all?" is a simple comparison.
  const text = (v: Parameters<typeof isTodo>[0]) => (typeof v === "string" && !isTodo(v) ? v : null);
  const rows = [
    { key: "college", label: t("college"), values: chosen.map((p) => getCollege(p.college)?.name ?? null) },
    { key: "level", label: pt("level"), values: chosen.map((p) => (p.level === "UG" ? pt("ug") : pt("pg"))) },
    { key: "duration", label: pt("duration"), values: chosen.map((p) => (typeof p.durationYears === "number" ? pt("years", { count: p.durationYears }) : null)) },
    { key: "fees", label: pt("fees"), values: chosen.map((p) => (typeof p.feesPerYearINR === "number" ? pt("feesValue", { amount: inr.format(p.feesPerYearINR) }) : null)) },
    { key: "campus", label: pt("campus"), values: chosen.map((p) => p.campuses.map((c) => getCampus(c)?.name ?? c).join(", ")) },
    { key: "entrance", label: pt("entrance"), values: chosen.map((p) => text(p.entrance)) },
    { key: "eligibility", label: pt("eligibility"), values: chosen.map((p) => text(p.eligibility)) },
    { key: "deadline", label: pt("deadline"), values: chosen.map((p) => text(p.deadline)) },
    { key: "careers", label: pt("careers"), values: chosen.map((p) => p.outcomes.join(", ")) },
  ].map((row) => ({ ...row, same: row.values.every((v) => v === row.values[0]) }));

  const fees = chosen.map((p) => (typeof p.feesPerYearINR === "number" ? p.feesPerYearINR : null));
  const known = fees.filter((f): f is number => f !== null);
  const highest = Math.max(...known);
  const lowest = known.length > 1 && Math.min(...known) < highest ? Math.min(...known) : null;

  const groups = colleges
    .map((c) => ({ name: c.shortName, list: programmes.filter((p) => p.college === c.slug) }))
    .filter((g) => g.list.length);
  const example = programmes.filter((p) => p.college === "engineering" && p.level === "UG").slice(0, 2);
  const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4";

  return (
    <GrailPage>
      <GrailHero kicker={nav("study")} title={t("title")} lead={<p>{t("intro")}</p>}>
      <form action={getPathname({ href: "/compare", locale })} method="get" className="mt-10 grid items-end gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        {Array.from({ length: MAX_COMPARE }, (_, i) => (
          <label key={i} className="flex min-w-0 flex-col gap-1 text-sm font-semibold">
            {t("slot", { n: i + 1 })}
            <select
              key={chosenSlugs[i] ?? "none"}
              name="p"
              defaultValue={chosenSlugs[i] ?? ""}
              className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-bg px-3 text-base font-normal"
            >
              <option value="">{t("choose")}</option>
              {groups.map((g) => (
                <optgroup key={g.name} label={g.name}>
                  {g.list.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-action px-6 font-semibold text-on-action">
          {t("submit")}
        </button>
      </form>
      </GrailHero>

      {/* The comparison itself sits on an off-white sheet that slides over the hero. */}
      <div data-tone="light" className="grail-sheet relative">
      <div className="site-container py-16 lg:py-24">
      {chosen.length < 2 ? (
        <div className="grail-paper p-6">
          <p className="text-lg">{t("empty")}</p>
          {example.length === 2 ? (
            <Link href={compareHref(example.map((p) => p.slug))} className={linkClass}>
              {t("example", { a: example[0]!.name, b: example[1]!.name })}
            </Link>
          ) : null}
        </div>
      ) : (
        <section aria-label={t("caption")}>
          <div className="flex flex-wrap items-center gap-x-6">
            <Link href={compareHref(chosenSlugs, onlyDiff ? "" : "&diff=1")} scroll={false} className={linkClass}>
              {onlyDiff ? t("showAll") : t("onlyDiff")}
            </Link>
            <CompareCopyLink className={linkClass} />
          </div>

          {/* Stacked rows on phones, a real grid from md up. Explicit roles keep it a table for screen readers either way. */}
          <table role="table" className="mt-6 block w-full md:table md:table-fixed">
            <caption className="sr-only">{t("caption")}</caption>
            <thead role="rowgroup" className="block md:table-header-group">
              <tr role="row" className="flex flex-col gap-2 md:table-row">
                <td role="cell" className="hidden w-44 md:table-cell" />
                {chosen.map((p) => (
                  <th
                    key={p.slug}
                    role="columnheader"
                    scope="col"
                    className="block rounded-2xl border border-line-subtle p-4 text-left align-top md:sticky md:top-16 md:table-cell md:rounded-none md:border-0 md:bg-bg md:px-3"
                  >
                    <Link href={`/programmes/${p.slug}`} className="font-display text-lg leading-snug font-bold text-fg underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="block md:table-row-group">
              {rows
                .filter((row) => !onlyDiff || !row.same)
                .map((row) => (
                  <tr key={row.key} role="row" className="block border-t border-line-subtle py-4 md:table-row md:py-0">
                    <th role="rowheader" scope="row" className="block pb-2 text-left align-top font-semibold md:table-cell md:py-4 md:pr-3">
                      {row.label}
                      {row.same ? <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-normal text-fg-muted">{t("same")}</span> : null}
                    </th>
                    {row.values.map((value, i) => (
                      <td key={chosen[i]!.slug} role="cell" className={`block py-1.5 align-top md:table-cell md:border-t md:border-line-subtle md:p-3 md:py-4 ${row.same ? "text-fg-muted" : ""}`}>
                        <span className="block text-xs text-fg-muted md:hidden">{chosen[i]!.name}</span>
                        {value ?? <span className="text-fg-muted">{pt("notPublished")}</span>}
                        {row.key === "fees" && fees[i] !== null ? (
                          <>
                            {/* Decorative: the amount above is the information. */}
                            <span aria-hidden="true" className="mt-2 block h-1.5 rounded-full bg-line-subtle">
                              <span className="block h-full origin-left rounded-full bg-tree" style={{ transform: `scaleX(${fees[i]! / highest})` }} />
                            </span>
                            {fees[i] === lowest ? <span className="mt-1 block text-sm font-semibold text-tree">{t("lowestFees")}</span> : null}
                          </>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              <tr role="row" className="block border-t border-line-subtle py-4 md:table-row md:py-0">
                <th role="rowheader" scope="row" className="block pb-2 text-left align-top font-semibold md:table-cell md:py-4 md:pr-3">
                  {t("source")}
                </th>
                {chosen.map((p) => (
                  <td key={p.slug} role="cell" className="block py-1.5 align-top md:table-cell md:border-t md:border-line-subtle md:p-3 md:py-4">
                    <span className="block text-xs text-fg-muted md:hidden">{p.name}</span>
                    {p.sources[0] ? (
                      <a href={p.sources[0]} className="inline-flex min-h-11 items-center">
                        {new URL(p.sources[0]).hostname.replace(/^www\./, "")}
                      </a>
                    ) : (
                      <span className="text-fg-muted">{pt("notPublished")}</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-6 text-sm text-fg-muted">{t("feesNote")}</p>
        </section>
      )}
      </div>
      </div>

      <GrailStart level={2} />
    </GrailPage>
  );
}
