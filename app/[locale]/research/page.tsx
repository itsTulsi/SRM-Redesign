import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { researchStats } from "@/lib/content";
import { telHref } from "@/lib/hostels";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";
import { researchCentres, type CentreCopy, type CentreSlug } from "@/lib/research-centres";
import { SECTION } from "@/lib/sections";

type Params = { params: Promise<{ locale: Locale }> };

const num = new Intl.NumberFormat("en-IN");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Centres" });
  return { title: `${t("metaTitle")} — SRMIST`, description: t("intro"), alternates: alternatesFor(locale, "/research") };
}

export default async function ResearchCentresPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Centres");
  const nav = await getTranslations("Nav");
  const { centres, dean, heroPhoto, patents } = researchCentres;
  // Whole objects per centre (the lists vary by centre), so read the messages directly rather than key by key.
  const copy = (await getMessages()).Centres.centres as Record<CentreSlug, CentreCopy>;
  const patentTotal = researchStats.find((s) => s.id === "patents")?.display;
  const ext = <span className="sr-only"> {nav("external")}</span>;
  const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4";
  const card = "rounded-2xl border border-line-subtle p-5";

  const list = (title: string, items: string[] | undefined) =>
    items?.length ? (
      <div>
        <h4 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{title}</h4>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("eyebrow")}</p>
        <h1 className="font-display text-hero font-bold">{t("title")}</h1>
        <p className="max-w-prose text-lg text-fg-muted">{t("intro")}</p>
        <Photo src={heroPhoto} alt="" decorative priority sizes="(min-width: 1440px) 1344px, 100vw" className="mt-6 aspect-[16/9] w-full rounded-3xl md:aspect-[21/9]" />
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className={card}>
            <p className="font-semibold">{t("deanTitle")}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {dean.name} · {t("deanRole")} · {dean.office}
            </p>
            <p className="flex flex-wrap gap-x-6">
              <a href={`mailto:${dean.email}`} className="inline-flex min-h-11 items-center break-all">
                {dean.email}
              </a>
              <a href={telHref(dean.phone)} className="inline-flex min-h-11 items-center font-semibold">
                {dean.phone}
              </a>
            </p>
          </div>
          <Link href={`/#${SECTION.research}`} className={`${linkClass} w-fit`}>
            {t("missionsLink")}
          </Link>
        </div>
      </header>

      <div className="mt-12 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
        <nav aria-labelledby="research-toc" className="mb-10 lg:mb-0">
          <h2 id="research-toc" className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {t("onThisPage")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-0">
            {[...centres.map((c) => ({ id: c.slug, label: c.acronym, title: copy[c.slug].name })), { id: "patents", label: t("patentsTitle"), title: undefined }].map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  title={l.title}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg no-underline hover:border-fg lg:rounded-none lg:border-0 lg:px-0 lg:text-base lg:hover:underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          <section aria-labelledby="centres-title" className="border-t border-line-subtle pt-12">
            <h2 id="centres-title" className="font-display text-section font-bold">
              {t("centresTitle")}
            </h2>
            <div className="mt-8 flex flex-col gap-8">
              {centres.map((c) => {
                const k = copy[c.slug];
                return (
                  <article key={c.slug} id={c.slug} aria-labelledby={`${c.slug}-title`} className="scroll-mt-24 overflow-hidden rounded-3xl border border-line-subtle lg:grid lg:grid-cols-[2fr_3fr]">
                    {c.photo ? (
                      <Photo src={c.photo} alt={t("photoAlt", { name: c.acronym })} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-72" />
                    ) : (
                      <div aria-hidden="true" className="grid aspect-[16/10] w-full place-items-center bg-[radial-gradient(90%_90%_at_30%_20%,var(--srm-blue-500),var(--srm-blue-900))] px-6 text-center font-display text-4xl font-bold text-paper/85 lg:aspect-auto lg:h-full lg:min-h-72">
                        {c.acronym}
                      </div>
                    )}
                    <div className="flex flex-col gap-5 p-6 lg:p-8">
                      <div>
                        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
                          {c.acronym}
                          {c.established ? ` · ${t("established", { year: c.established })}` : ""}
                        </p>
                        <h3 id={`${c.slug}-title`} className="mt-1 font-display text-2xl font-bold">
                          {k.name}
                        </h3>
                      </div>
                      <p>{k.brief}</p>
                      {list(t("focus"), k.focus)}
                      {list(t("facilities"), k.facilities)}
                      {list(t("highlights"), k.highlights)}
                      <div className="mt-auto flex flex-col border-t border-line-subtle pt-4 text-sm">
                        <span className="text-fg-muted">
                          {t("contact")} · {c.contact.name ? `${c.contact.name}, ` : ""}
                          {t(`roles.${c.contact.role}`)}
                        </span>
                        <a href={`mailto:${c.contact.email}`} className="inline-flex min-h-11 items-center break-all">
                          {c.contact.email}
                        </a>
                        {c.contact.phone ? (
                          <a href={telHref(c.contact.phone)} className="inline-flex min-h-11 items-center font-semibold">
                            {c.contact.phone}
                          </a>
                        ) : null}
                        <p className="flex flex-wrap gap-x-6">
                          {c.booking ? (
                            <a href={c.booking} className={linkClass}>
                              {t(`booking.${c.slug as "nrc" | "dbt" | "hpcc"}`)}
                              {ext}
                            </a>
                          ) : null}
                          <a href={c.source} className={linkClass}>
                            {t("officialPage")}
                            {ext}
                          </a>
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="patents" aria-labelledby="patents-title" className="scroll-mt-24 border-t border-line-subtle pt-12 pb-4">
            <h2 id="patents-title" className="font-display text-section font-bold">
              {t("patentsTitle")}
            </h2>
            <div className="mt-6 flex flex-col gap-8">
              <p className="max-w-prose text-lg">{t("patents.lead")}</p>
              {patentTotal ? (
                <p className={`${card} w-fit`}>
                  <span className="block font-display text-5xl font-bold">{patentTotal}</span>
                  <span className="text-fg-muted">{t("patents.headline")}</span>
                </p>
              ) : null}
              <div>
                <p className="text-fg-muted">{t("patents.registerNote")}</p>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    { n: patents.granted.total, label: t("patents.granted", { years: patents.granted.years }) },
                    { n: patents.published.total, label: t("patents.published", { years: patents.published.years }) },
                    { n: patents.transfers, label: t("patents.transfers") },
                  ].map((s) => (
                    <div key={s.label} className={`${card} flex flex-col-reverse`}>
                      <dt className="text-sm text-fg-muted">{s.label}</dt>
                      <dd className="font-display text-3xl font-bold">{num.format(s.n)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("patents.byOffice")}</h3>
                <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {(Object.keys(patents.granted.byOffice) as (keyof typeof patents.granted.byOffice)[]).map((o) => (
                    <div key={o} className={`${card} flex flex-col-reverse`}>
                      <dt className="text-sm text-fg-muted">{t(`patents.offices.${o}`)}</dt>
                      <dd className="font-display text-3xl font-bold">{patents.granted.byOffice[o]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("patents.usTitle")}</h3>
                  <ul className="mt-4 flex flex-col divide-y divide-line-subtle">
                    {patents.usGranted.map((p) => (
                      <li key={p.number} className="flex flex-col gap-1 py-3">
                        <span>{t(`patents.us.${p.title}`)}</span>
                        <span className="text-sm text-fg-muted tabular-nums">
                          {p.number} · {p.year}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("patents.transfersTitle")}</h3>
                  <ul className="mt-4 flex flex-col divide-y divide-line-subtle">
                    {patents.transferList.map((k) => (
                      <li key={k} className="py-3">
                        {t(`patents.transferList.${k}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="flex flex-wrap gap-x-6">
                {(["granted", "published", "transfers"] as const).map((k) => (
                  <a key={k} href={patents.sources[k]} className={linkClass}>
                    {t(`patents.links.${k}`)}
                    {ext}
                  </a>
                ))}
              </p>
              <p className="text-sm text-fg-muted">{t("sourceNote")}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
