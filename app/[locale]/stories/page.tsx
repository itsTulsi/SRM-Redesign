import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoryVisual } from "@/components/acts/StoryVisual";
import { GrailChapter, GrailHero, GrailPage, GrailStart, JumpChips } from "@/components/grail/GrailPage";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { formatEventDate, getContent, isTodo, upcomingEvents } from "@/lib/content";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";
import { SECTION } from "@/lib/sections";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Stories" });
  return {
    title: `${t("metaTitle")} — SRMIST`,
    description: t("intro"),
    alternates: alternatesFor(locale, "/stories"),
    ...socialFor(locale, { title: t("metaTitle"), description: t("intro"), path: "/stories" }),
  };
}

/**
 * Stories: the curated story of the week and what's coming up (Harvard model), every piece of student work,
 * and alumni as people with their career paths. The homepage stays chapters; this is where the depth lives.
 */
export default async function StoriesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Stories");
  const week = await getTranslations("Acts.thisWeek");
  const lead = await getTranslations("Acts.lead");
  const nav = await getTranslations("Nav");
  const { featuredStory, events: allEvents, stories, alumni } = getContent(locale);
  const events = upcomingEvents(allEvents);
  const published = stories.filter((s) => !isTodo(s.title) && s.slug !== featuredStory?.slug);

  return (
    <GrailPage>
      <GrailHero kicker={t("kicker")} title={t("title")} lead={<p>{t("intro")}</p>}>
        <JumpChips
          label={t("onThisPage")}
          items={[
            { href: `#${SECTION.thisWeek}`, label: nav("thisWeek") },
            { href: `#${SECTION.studentWork}`, label: t("studentWorkTitle") },
            { href: `#${SECTION.alumni}`, label: nav("alumni") },
          ]}
        />
      </GrailHero>

      <GrailChapter id={SECTION.thisWeek} tone="light" kicker={t("kicker")} level={2} title={week("title")} titleId="this-week-title">
        {featuredStory ? (
          <article aria-labelledby="featured-story" className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <StoryVisual story={featuredStory} priority sizes="(min-width: 1024px) 58vw, 100vw" className="aspect-[16/10] rounded-[28px] lg:col-span-7" />
            <div className="flex flex-col gap-4 lg:col-span-5">
              <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{week("featured")}</p>
              <h3 id="featured-story" className="grail-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] text-balance">
                {featuredStory.title}
              </h3>
              <p className="text-lg text-fg-muted">{featuredStory.dek}</p>
              <Link href={`/stories/${featuredStory.slug}`} className="grail-cta grail-cta-ink w-fit">
                {week("readStory")}
              </Link>
            </div>
          </article>
        ) : null}

        {events.length > 0 ? (
          <>
            <h3 className="mt-16 text-sm font-semibold tracking-wide text-fg-muted uppercase">{week("upcoming")}</h3>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((e) => (
                <li key={e.slug}>
                  <a href={e.url} className="grail-paper grail-paper-link group flex h-full min-h-11 flex-col gap-2 p-5 text-[var(--fg)] no-underline">
                    <time dateTime={e.start} className="grail-num text-2xl">
                      {formatEventDate(e, locale)}
                    </time>
                    <span className="leading-snug underline-offset-4 group-hover:underline">{e.title}</span>
                    <span className="sr-only"> {nav("external")}</span>
                  </a>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </GrailChapter>

      <GrailChapter id={SECTION.studentWork} kicker={t("kicker")} level={3} title={t("studentWorkTitle")} titleId="student-work-title" intro={t("studentWorkIntro")}>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((s) => (
            <li key={s.slug}>
              <article className="grail-paper grail-paper-link group relative flex h-full flex-col overflow-hidden focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-[var(--focus)]">
                <StoryVisual story={s} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10] w-full" />
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {!isTodo(s.date) ? <p className="text-sm text-fg-muted">{s.date}</p> : null}
                  <h3 className="text-xl leading-snug font-bold">
                    <Link href={`/stories/${s.slug}`} className="text-[var(--fg)] no-underline outline-none after:absolute after:inset-0 after:content-['']">
                      {s.title}
                    </Link>
                  </h3>
                  <p className="text-fg-muted">{s.dek}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </GrailChapter>

      <GrailChapter id={SECTION.alumni} tone="light" kicker={nav("alumni")} level={4} title={lead("alumniTitle")} titleId="alumni-title" intro={t("alumniIntro")}>
        <ul className="grid gap-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {alumni.map((a) => (
            <li key={a.slug} id={a.slug} className="grid scroll-mt-24 grid-cols-[6rem_1fr] items-start gap-4 sm:flex sm:flex-col">
              <Photo
                src={a.photo}
                alt={lead("portraitAlt", { name: a.name })}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 96px"
                className="aspect-square w-24 rounded-2xl sm:w-full sm:rounded-[28px]"
              />
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <h3 className="grail-display text-2xl sm:text-3xl">{a.name}</h3>
                  <p className="mt-1 sm:text-lg">{a.role}</p>
                </div>
                <ol aria-label={lead("pathLabel", { name: a.name })} className="flex flex-col gap-1.5 border-l border-[var(--line)] pl-4 text-sm text-fg-muted">
                  <li>
                    SRM · <Fact value={a.degree} />
                  </li>
                  {a.path.map((step) => (
                    <li key={step}>
                      <Fact value={step} />
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm">
          <a href="https://www.srmist.edu.in/alumni-affairs/notable-alumni/" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            {t("source")}
            <span className="sr-only"> {nav("external")}</span>
          </a>
        </p>
      </GrailChapter>

      <GrailStart level={5} />
    </GrailPage>
  );
}
