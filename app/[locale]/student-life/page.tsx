import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { telHref } from "@/lib/hostels";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";
import { LIFE_SECTIONS, lifeSections, studentLife, type LifeSection } from "@/lib/student-life";

type Params = { params: Promise<{ locale: Locale }> };
type Item = { t: string; d: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Life" });
  return { title: `${t("metaTitle")} — SRMIST`, description: t("intro"), alternates: alternatesFor(locale, "/student-life") };
}

export default async function StudentLifePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Life");
  const nav = await getTranslations("Nav");
  const { contacts, events, photos, sources, stats, worship } = studentLife;
  const ar = contacts.antiRagging;
  const ext = <span className="sr-only"> {nav("external")}</span>;
  const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4";
  const card = "rounded-2xl border border-line-subtle p-5";
  const halfPhoto = "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw";

  const section = (key: LifeSection, children: React.ReactNode) => {
    const id = LIFE_SECTIONS[key];
    return (
      <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line-subtle pt-12 pb-4">
        <h2 id={`${id}-title`} className="font-display text-section font-bold">
          {t(`sections.${key}`)}
        </h2>
        <div className="mt-6 flex flex-col gap-8">
          {children}
          <a href={sources[key]} className={`${linkClass} w-fit text-sm`}>
            {t("officialPage")}
            {ext}
          </a>
        </div>
      </section>
    );
  };

  const items = (list: Item[], cols = "md:grid-cols-2") => (
    <ul className={`grid gap-4 ${cols}`}>
      {list.map((s) => (
        <li key={s.t} className={card}>
          <h3 className="font-semibold">{s.t}</h3>
          <p className="mt-2 text-fg-muted">{s.d}</p>
        </li>
      ))}
    </ul>
  );

  const bullets = (list: string[]) => (
    <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
      {list.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );

  /** Name, role and whichever of email / phone SRM publishes for an institutional contact. */
  const person = (p: { name: string; email?: string; phone?: string }, role: string) => (
    <div className={card}>
      <p className="font-semibold">{p.name}</p>
      <p className="mt-1 text-sm text-fg-muted">{role}</p>
      {p.email ? (
        <a href={`mailto:${p.email}`} className="inline-flex min-h-11 items-center break-all text-sm">
          {p.email}
        </a>
      ) : null}
      {p.phone ? (
        <a href={telHref(p.phone)} className="flex min-h-11 items-center font-semibold">
          {p.phone}
        </a>
      ) : null}
    </div>
  );

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("eyebrow")}</p>
        <h1 className="font-display text-hero font-bold">{t("title")}</h1>
        <p className="max-w-prose text-lg text-fg-muted">{t("intro")}</p>
        <Photo src={photos.holistic} alt="" decorative priority sizes="(min-width: 1440px) 1344px, 100vw" className="mt-6 aspect-[16/9] w-full rounded-3xl md:aspect-[21/9]" />
      </header>

      <div className="mt-12 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
        <nav aria-labelledby="life-toc" className="mb-10 lg:mb-0">
          <h2 id="life-toc" className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {t("onThisPage")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-0">
            {lifeSections.map((key) => (
              <li key={key}>
                <a
                  href={`#${LIFE_SECTIONS[key]}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg no-underline hover:border-fg lg:rounded-none lg:border-0 lg:px-0 lg:text-base lg:hover:underline"
                >
                  {t(`sections.${key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          {section(
            "holistic",
            <>
              <p className="max-w-prose text-lg">{t("holistic.lead")}</p>
              {items(t.raw("holistic.points") as Item[], "md:grid-cols-3")}
              <Link href="/hostels" className={`${linkClass} w-fit`}>
                {t("holistic.housing")}
              </Link>
            </>,
          )}

          {section(
            "green",
            <>
              <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
                <p className="max-w-prose text-lg">{t("green.lead")}</p>
                <p className={card}>
                  <span className="block font-display text-4xl font-bold">{stats.acres}</span>
                  <span className="text-sm text-fg-muted">{t("green.acres")}</span>
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Photo src={photos.cycling} alt={t("green.points.0.t")} sizes={halfPhoto} className="aspect-[4/3] w-full rounded-3xl" />
                <Photo src={photos.transport} alt={t("green.points.1.t")} sizes={halfPhoto} className="aspect-[4/3] w-full rounded-3xl" />
              </div>
              {items(t.raw("green.points") as Item[])}
              <p className="max-w-prose text-fg-muted">{t("green.policies")}</p>
              <div className="grid gap-4 md:grid-cols-3">
                {person(contacts.campusLife, t("green.campusLife"))}
                <div className={card}>
                  <p className="font-semibold">{t("green.security")}</p>
                  <a href={telHref(contacts.security)} className="flex min-h-11 items-center font-semibold">
                    {contacts.security}
                  </a>
                </div>
                <div className={card}>
                  <p className="font-semibold">{t("green.parking")}</p>
                  <a href={telHref(contacts.parking)} className="flex min-h-11 items-center font-semibold">
                    {contacts.parking}
                  </a>
                </div>
              </div>
            </>,
          )}

          {section(
            "affairs",
            <>
              <p className="max-w-prose text-lg">{t("affairs.lead")}</p>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {(["clubs", "houses", "events", "counselling"] as const).map((k) => (
                  <div key={k} className={`${card} flex flex-col-reverse`}>
                    <dt className="text-sm text-fg-muted">{t(`affairs.stats.${k}`)}</dt>
                    <dd className="font-display text-3xl font-bold">{stats[k]}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("affairs.eventsTitle")}</h3>
                <ul className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {events.map((e) => (
                    <li key={e.slug} className="overflow-hidden rounded-3xl border border-line-subtle">
                      <Photo src={e.photo} alt="" decorative sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] w-full" />
                      <div className="p-5">
                        <h4 className="font-display text-xl font-bold">{e.name}</h4>
                        <p className="mt-1 text-sm text-fg-muted">{t(`affairs.events.${e.slug}`)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-fg-muted">{t("affairs.moreFests")}</p>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("affairs.teamTitle")}</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {contacts.dsa.map((p) => (
                    <div key={p.role} className="contents">
                      {person(p, t(`affairs.roles.${p.role}`))}
                    </div>
                  ))}
                </div>
              </div>
            </>,
          )}

          {section(
            "diversity",
            <>
              <p className="max-w-prose text-lg">{t("diversity.lead")}</p>
              <p className="max-w-prose text-fg-muted">{t("diversity.body")}</p>
            </>,
          )}

          {section(
            "counselling",
            <>
              <p className="max-w-prose text-lg">{t("counselling.lead")}</p>
              <p role="note" className="rounded-2xl border border-l-4 border-line border-l-action p-5 text-lg font-semibold">
                {t.rich("counselling.urgent", {
                  n: contacts.teleManas,
                  tel: (chunks) => (
                    <a href={`tel:${contacts.teleManas}`} className="underline underline-offset-4">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
              <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
                {items(t.raw("counselling.services") as Item[])}
                <Photo src={photos.wellness} alt={t("counselling.services.4.t")} sizes="(min-width: 1024px) 25vw, 100vw" className="aspect-[4/3] w-full rounded-3xl lg:aspect-[3/4]" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("counselling.counsellorsTitle")}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {contacts.counsellors.map((p) => (
                    <div key={p.name} className="contents">
                      {person(p, t(`counselling.roles.${p.role}`))}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-fg-muted">
                {t.rich("counselling.wellnessContacts", {
                  uwp: contacts.wellness.uwp,
                  centre: contacts.wellness.centre,
                  uwpMail: (chunks) => (
                    <a href={`mailto:${contacts.wellness.uwp}`} className="inline-flex min-h-11 items-center break-all">
                      {chunks}
                    </a>
                  ),
                  centreMail: (chunks) => (
                    <a href={`mailto:${contacts.wellness.centre}`} className="inline-flex min-h-11 items-center break-all">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </>,
          )}

          {section(
            "community",
            <>
              <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="flex flex-col gap-4">
                  <p className="max-w-prose text-lg">{t("community.lead")}</p>
                  <p className="text-fg-muted">{t("community.impact")}</p>
                </div>
                <Photo src={photos.community} alt={t("community.items.0.t")} sizes={halfPhoto} className="aspect-[4/3] w-full rounded-3xl" />
              </div>
              {items(t.raw("community.items") as Item[], "md:grid-cols-3")}
            </>,
          )}

          {section(
            "clubs",
            <>
              <p className="max-w-prose text-lg">{t("clubs.lead")}</p>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {studentLife.clubs.map((slug) => (
                  <li key={slug} className={card}>
                    <h3 className="font-semibold">{t(`clubs.items.${slug}.t`)}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{t(`clubs.items.${slug}.d`)}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {section(
            "antiRagging",
            <>
              <p className="max-w-prose text-lg">{t("antiRagging.lead")}</p>
              <div className="rounded-3xl border border-l-4 border-line border-l-action p-6">
                <h3 className="font-display text-2xl font-bold">{t("antiRagging.helpTitle")}</h3>
                <div className="mt-4 grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-fg-muted">{t("antiRagging.srm")}</p>
                    {ar.helpline.map((n) => (
                      <a key={n} href={telHref(n)} className="flex min-h-11 items-center text-lg font-semibold">
                        {n}
                      </a>
                    ))}
                    <a href={`mailto:${ar.email}`} className="inline-flex min-h-11 items-center break-all text-sm">
                      {ar.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-fg-muted">{t("antiRagging.national")}</p>
                    <a href={`tel:${ar.national.phone.replace(/-/g, "")}`} className="flex min-h-11 items-center text-lg font-semibold">
                      {ar.national.phone}
                    </a>
                    <a href={`mailto:${ar.national.email}`} className="inline-flex min-h-11 items-center break-all text-sm">
                      {ar.national.email}
                    </a>
                    <a href={ar.national.url} className="flex min-h-11 items-center text-sm">
                      antiragging.in{ext}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-fg-muted">{t("antiRagging.ugc")}</p>
                    <a href={`mailto:${ar.ugc.email}`} className="inline-flex min-h-11 items-center break-all text-sm">
                      {ar.ugc.email}
                    </a>
                    <a href={ar.ugc.url} className="flex min-h-11 items-center text-sm">
                      c4yindia.org{ext}
                    </a>
                  </div>
                </div>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("antiRagging.whatTitle")}</h3>
                  {bullets(t.raw("antiRagging.what") as string[])}
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{t("antiRagging.punishTitle")}</h3>
                  {bullets(t.raw("antiRagging.punish") as string[])}
                </div>
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">{t("antiRagging.officersTitle")}</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {person(ar.squad, t("antiRagging.squad"))}
                  {person(ar.committee, t("antiRagging.committee"))}
                </div>
              </div>
            </>,
          )}

          {section(
            "antiDiscrimination",
            <>
              <p className="max-w-prose text-lg">{t("antiDiscrimination.lead")}</p>
              <p className="max-w-prose text-fg-muted">{t("antiDiscrimination.body")}</p>
            </>,
          )}

          {section(
            "religious",
            <>
              <p className="max-w-prose text-lg">{t("religious.lead")}</p>
              <ul className="grid gap-6 md:grid-cols-3">
                {worship.map((w) => (
                  <li key={w.slug} className="overflow-hidden rounded-3xl border border-line-subtle">
                    <Photo src={w.photo} alt="" decorative sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[4/3] w-full" />
                    <div className="p-5">
                      <h3 className="font-display text-xl font-bold">{t(`religious.items.${w.slug}.t`)}</h3>
                      <p className="mt-3 text-sm">
                        <span className="font-semibold">{t("religious.festivals")}: </span>
                        <span className="text-fg-muted">{t(`religious.items.${w.slug}.d`)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {section(
            "eoc",
            <>
              <p className="max-w-prose text-lg">{t("eoc.lead")}</p>
              {items(t.raw("eoc.items") as Item[])}
              <div className="md:max-w-sm">{person(contacts.eoc, t("eoc.chair"))}</div>
              <p className="text-sm text-fg-muted">{t("sourceNote")}</p>
            </>,
          )}
        </div>
      </div>
    </main>
  );
}
