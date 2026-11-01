import { getLocale, getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { formatEventDate, getContent, upcomingEvents } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";

/** Harvard model: one curated story, then a compact rail of what's coming up. */
export async function ThisWeek() {
  const t = await getTranslations("Acts.thisWeek");
  const nav = await getTranslations("Nav");
  const locale = await getLocale();
  const { events: allEvents, featuredStory } = getContent(locale);
  const events = upcomingEvents(allEvents);

  return (
    <section id={SECTION.thisWeek} aria-labelledby="this-week-title" className="bg-bg py-24 text-fg lg:py-32">
      <div className="site-container">
        <h2 id="this-week-title" className="font-display text-section font-bold">
          {t("title")}
        </h2>

        {featuredStory ? (
          <article aria-labelledby="featured-story" className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            <Photo
              reveal
              src={featuredStory.media.photo}
              alt={featuredStory.title}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="aspect-[16/10] rounded-3xl lg:col-span-7"
            />
            <div className="flex flex-col gap-4 lg:col-span-5">
              <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("featured")}</p>
              <h3 id="featured-story" className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] font-bold text-balance">
                {featuredStory.title}
              </h3>
              <p className="text-lg text-fg-muted">{featuredStory.dek}</p>
              <Link
                href={`/stories/${featuredStory.slug}`}
                className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold underline-offset-4"
              >
                {t("readStory")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ) : null}

        {events.length > 0 ? (
          <>
            <h3 className="mt-16 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("upcoming")}</h3>
            {/* A timeline, because that's what these are: one branch, a node per date. Down the page on phones, across from lg. */}
            <ol className="mt-6 grid max-w-5xl lg:auto-cols-fr lg:grid-flow-col">
              {events.map((e) => (
                <li key={e.slug} className="relative border-l border-line pb-8 pl-6 last:pb-0 lg:border-t lg:border-l-0 lg:pt-6 lg:pr-10 lg:pb-0 lg:pl-0">
                  <span aria-hidden="true" className="absolute top-2 -left-[6px] size-3 rounded-full bg-tree lg:top-[-6px] lg:left-0" />
                  <a href={e.url} className="group flex min-h-11 flex-col gap-2 text-fg no-underline">
                    <time dateTime={e.start} className="font-display text-lg font-bold">
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
      </div>
    </section>
  );
}
