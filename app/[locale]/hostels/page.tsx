import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlockCard } from "@/components/hostels/BlockCard";
import { FeeTable } from "@/components/hostels/FeeTable";
import { Photo } from "@/components/ui/Photo";
import { getContent } from "@/lib/content";
import { HOSTEL_SECTIONS, hostels, telHref, type HostelSection, type Meal } from "@/lib/hostels";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale }> };

const inr = new Intl.NumberFormat("en-IN");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Hostels" });
  return { title: `${t("metaTitle")} — SRMIST`, description: t("intro"), alternates: alternatesFor(locale, "/hostels") };
}

/** "07:30" → "7:30 AM" / "முற்பகல் 7:30" / "7:30 am" in the visitor's language. */
function clock(hhmm: string, locale: Locale) {
  const [h, m] = hhmm.split(":").map(Number);
  return new Intl.DateTimeFormat(`${locale}-IN`, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, h, m));
}

export default async function HostelsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Hostels");
  const nav = await getTranslations("Nav");
  const { site } = getContent(locale);
  const { contacts, dining, fees } = hostels;
  const ext = <span className="sr-only"> {nav("external")}</span>;
  const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4";

  const section = (id: HostelSection, children: React.ReactNode) => (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line-subtle pt-12 pb-4">
      <h2 id={`${id}-title`} className="font-display text-section font-bold">
        {t(`sections.${id}`)}
      </h2>
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  );

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("eyebrow")}</p>
        <h1 className="font-display text-hero font-bold">{t("title")}</h1>
        <p className="max-w-prose text-lg text-fg-muted">{t("intro")}</p>
        <Photo src={hostels.heroPhoto} alt="" decorative priority sizes="(min-width: 1440px) 1344px, 100vw" className="mt-6 aspect-[16/9] w-full rounded-3xl md:aspect-[21/9]" />
      </header>

      <div className="mt-12 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
        <nav aria-labelledby="hostels-toc" className="mb-10 lg:mb-0">
          <h2 id="hostels-toc" className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {t("onThisPage")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-0">
            {HOSTEL_SECTIONS.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg no-underline hover:border-fg lg:rounded-none lg:border-0 lg:px-0 lg:text-base lg:hover:underline"
                >
                  {t(`sections.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          {section(
            "accommodation",
            <>
              <p className="max-w-prose text-lg">{t("accommodationIntro")}</p>
              <dl className="grid gap-6 sm:grid-cols-3">
                {(["men", "women", "international"] as const).map((k) => (
                  <div key={k} className="rounded-2xl border border-line-subtle p-5">
                    <dt className="text-sm text-fg-muted">{t(`capacity.${k}`)}</dt>
                    <dd className="mt-1 font-display text-3xl font-bold">{t("approx", { n: hostels.capacity[k] })}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("facilitiesTitle")}</h3>
                <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {(t.raw("facilities") as string[]).map((f) => (
                    <li key={f} className="flex gap-3">
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-tree">
                        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="rounded-3xl border border-line-subtle p-6 lg:p-8">
                <blockquote className="border-l-2 border-tree pl-4 text-lg">“{t("directorQuote")}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{contacts.director.name}</span>
                  <span className="block text-fg-muted">{t("directorRole")}</span>
                </figcaption>
              </figure>
            </>,
          )}

          {section(
            "women",
            <>
              <p className="max-w-prose text-lg">{t("womenIntro", { n: hostels.capacity.women })}</p>
              <p className="max-w-prose text-fg-muted">{t("womenAmenities")}</p>
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {hostels.women.map((b) => (
                  <BlockCard key={b.slug} block={b} />
                ))}
              </ul>
            </>,
          )}

          {section(
            "men",
            <>
              <p className="max-w-prose text-lg">{t("menIntro", { n: hostels.capacity.men })}</p>
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {hostels.men.map((b) => (
                  <BlockCard key={b.slug} block={b} />
                ))}
              </ul>
            </>,
          )}

          {section(
            "international",
            <>
              <p className="max-w-prose text-lg">{t("intlIntro", { n: hostels.capacity.international })}</p>
              <ul className="grid gap-6 sm:grid-cols-2">
                {hostels.international.map((b) => (
                  <BlockCard key={b.slug} block={b} />
                ))}
              </ul>
            </>,
          )}

          {section(
            "fees",
            <>
              <p className="max-w-prose text-lg">{t("feesIntro")}</p>
              <FeeTable id="fees-women" caption={t("feesWomen")} rows={fees.women} />
              <FeeTable id="fees-men" caption={t("feesMen")} rows={fees.men} />
              <p className="text-fg-muted">{t("laundry", { men: inr.format(fees.laundry.men), women: inr.format(fees.laundry.women) })}</p>
              <p className="flex flex-wrap gap-x-6 text-sm">
                <span className="inline-flex min-h-11 items-center text-fg-muted">{t("feesSource")}:</span>
                <a href={fees.sources.women} className={linkClass}>{t("girls")}{ext}</a>
                <a href={fees.sources.men} className={linkClass}>{t("boys")}{ext}</a>
              </p>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("otherCohortsTitle")}</h3>
                <ul className="mt-4 flex flex-col divide-y divide-line-subtle">
                  {fees.otherCohorts.map((c) => (
                    <li key={c.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>{t(`cohorts.${c.key}`)}</span>
                      <span className="flex gap-6 text-sm">
                        {c.women ? <a href={c.women} className={linkClass}>{t("girls")}{ext}</a> : null}
                        {c.men ? <a href={c.men} className={linkClass}>{t("boys")}{ext}</a> : null}
                        {c.both ? <a href={c.both} className={linkClass}>{t("circular")}{ext}</a> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>,
          )}

          {section(
            "apply",
            <>
              <ol className="flex flex-col gap-4">
                {(t.raw("applySteps") as string[]).map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-action font-display font-bold text-on-action">
                      {i + 1}
                    </span>
                    <span className="pt-1.5 text-lg">{s}</span>
                  </li>
                ))}
              </ol>
              <a
                href={hostels.sources.portal}
                className="inline-flex min-h-12 w-fit items-center rounded-full border-2 border-[var(--action-edge)] bg-action px-6 font-semibold text-on-action no-underline"
              >
                {t("applyPortal")}
                {ext}
              </a>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("checklistTitle")}</h3>
                <div className="mt-4 grid gap-6 md:grid-cols-3">
                  {(["before", "during", "after"] as const).map((k) => (
                    <div key={k} className="rounded-2xl border border-line-subtle p-5">
                      <h4 className="font-semibold">{t(k)}</h4>
                      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-fg-muted">
                        {(t.raw(`${k}Items`) as string[]).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("whoTitle")}</h3>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  {(["eligible", "notEligible"] as const).map((k) => (
                    <div key={k}>
                      <h4 className="font-semibold">{t(`${k}Title`)}</h4>
                      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-fg-muted">
                        {(t.raw(k) as string[]).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <p className="flex flex-wrap gap-x-6">
                <a href={hostels.sources.rules} className={linkClass}>{t("rulesLink")}{ext}</a>
                <a href={hostels.sources.codeOfConduct} className={linkClass}>{t("codeLink")}{ext}</a>
              </p>
            </>,
          )}

          {section(
            "dining",
            <>
              <p className="max-w-prose text-lg">{t("diningIntro")}</p>
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("messTimings")}</h3>
                  <table className="mt-4 w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-fg-muted">
                        <th scope="col" className="py-2 pr-3 font-semibold"><span className="sr-only">{t("messTimings")}</span></th>
                        <th scope="col" className="py-2 pr-3 font-semibold">{t("workingDays")}</th>
                        <th scope="col" className="py-2 font-semibold">{t("holidays")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dining.mess.working.map(([meal, from, to], i) => {
                        const h = dining.mess.holidays[i]!;
                        return (
                          <tr key={meal} className="border-b border-line-subtle">
                            <th scope="row" className="py-2 pr-3 font-semibold">{t(`meals.${meal}`)}</th>
                            <td className="py-2 pr-3">{clock(from, locale)} – {clock(to, locale)}</td>
                            <td className="py-2">{clock(h[1], locale)} – {clock(h[2], locale)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("guestTitle")}</h3>
                  <p className="mt-4 text-fg-muted">{t("guestIntro")}</p>
                  <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2">
                    {dining.guestRates.map(([meal, rate]: [Meal, number]) => (
                      <div key={meal} className="contents">
                        <dt>{t(`meals.${meal}`)}</dt>
                        <dd className="text-right font-semibold tabular-nums">₹{inr.format(rate)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("messRulesTitle")}</h3>
                <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
                  {(t.raw("messRules") as string[]).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("canteensTitle")}</h3>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {dining.canteens.map((c) => (
                    <li key={c.slug} className="rounded-2xl border border-line-subtle p-5">
                      <h4 className="font-semibold">{c.name}</h4>
                      <p className="mt-1 text-sm text-fg-muted">{t(`canteens.${c.slug}`)}</p>
                      <p className="mt-2 text-sm font-semibold">
                        {c.hours === "24h" ? t("open24") : t("hours", { from: clock(c.hours[0], locale), to: clock(c.hours[1], locale) })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </>,
          )}

          {section(
            "safety",
            <>
              <p className="max-w-prose text-lg">{t("safetyIntro")}</p>
              <ul className="grid gap-4 md:grid-cols-2">
                {(t.raw("safety") as { t: string; d: string }[]).map((s) => (
                  <li key={s.t} className="rounded-2xl border border-line-subtle p-5">
                    <h3 className="font-semibold">{s.t}</h3>
                    <p className="mt-2 text-fg-muted">{s.d}</p>
                  </li>
                ))}
              </ul>
              <p className="flex flex-wrap gap-x-6">
                <Link href={site.parentLinks.antiRagging} className={linkClass}>{t("antiRagging")}</Link>
                <a href={hostels.sources.rules} className={linkClass}>{t("rulesLink")}{ext}</a>
              </p>
            </>,
          )}

          {section(
            "contact",
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-line-subtle p-5">
                  <h3 className="font-semibold">{t("directorate")}</h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    {contacts.director.name} · {t("directorTitle")}
                  </p>
                  <a href={`mailto:${contacts.director.email}`} className="inline-flex min-h-11 items-center break-all">{contacts.director.email}</a>
                  <a href={telHref(contacts.director.phone)} className="flex min-h-11 items-center font-semibold">{contacts.director.phone}</a>
                </div>
                {(["women", "men"] as const).map((k) => {
                  const c = contacts[k];
                  return (
                    <div key={k} className="rounded-2xl border border-line-subtle p-5">
                      <h3 className="font-semibold">{t(k === "men" ? "menOffice" : "womenOffice")}</h3>
                      <p className="mt-1 text-sm text-fg-muted">
                        {t("blocksLabel")}: {c.blocks}
                      </p>
                      <dl className="mt-3 grid grid-cols-[max-content_1fr] items-center gap-x-4 text-sm">
                        <dt className="text-fg-muted">{t("helpdesk")}</dt>
                        <dd><a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center break-all">{c.email}</a></dd>
                        <dt className="text-fg-muted">{t("mobile")}</dt>
                        <dd><a href={telHref(c.mobile)} className="inline-flex min-h-11 items-center font-semibold">{c.mobile}</a></dd>
                        <dt className="text-fg-muted">{t("accounts")}</dt>
                        <dd><a href={telHref(c.accounts)} className="inline-flex min-h-11 items-center">{c.accounts}</a></dd>
                        <dt className="text-fg-muted">{t("office")}</dt>
                        <dd className="flex flex-wrap gap-x-4">
                          {c.office.map((n) => (
                            <a key={n} href={telHref(n)} className="inline-flex min-h-11 items-center">{n}</a>
                          ))}
                        </dd>
                      </dl>
                    </div>
                  );
                })}
                <div className="rounded-2xl border border-line-subtle p-5">
                  <h3 className="font-semibold">{t("kopperundevi")}</h3>
                  <a href={`mailto:${contacts.kopperundevi.email}`} className="inline-flex min-h-11 items-center break-all text-sm">{contacts.kopperundevi.email}</a>
                  <a href={telHref(contacts.kopperundevi.mobile)} className="flex min-h-11 items-center font-semibold">{contacts.kopperundevi.mobile}</a>
                  <h3 className="mt-4 font-semibold">{t("pierre")}</h3>
                  <a href={`mailto:${contacts.pierreFauchard.email}`} className="inline-flex min-h-11 items-center break-all text-sm">{contacts.pierreFauchard.email}</a>
                  <a href={telHref(contacts.pierreFauchard.mobile)} className="flex min-h-11 items-center font-semibold">{contacts.pierreFauchard.mobile}</a>
                </div>
              </div>
              <p className="flex flex-wrap gap-x-6">
                <a href={hostels.sources.staff} className={linkClass}>{t("staffLink")}{ext}</a>
                <a href={hostels.sources.hub} className={linkClass}>{t("officialPage")}{ext}</a>
              </p>
              <p className="text-sm text-fg-muted">{t("sourceNote")}</p>
            </>,
          )}
        </div>
      </div>
    </main>
  );
}
