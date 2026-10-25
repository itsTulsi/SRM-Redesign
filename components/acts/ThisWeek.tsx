import { getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { events, featuredStory } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";

/** Harvard model: one curated story, then a compact rail of what's coming up. */
export async function ThisWeek() {
  const t = await getTranslations("Acts.thisWeek");
  const nav = await getTranslations("Nav");

  return (
    <section id={SECTION.thisWeek} aria-labelledby="this-week-title" className="bg-bg py-24 text-fg lg:py-32">
      <div className="site-container">
        <h2 id="this-week-title" className="font-display text-section font-bold">
          {t("title")}
        </h2>

        {featuredStory ? (
          <article aria-labelledby="featured-story" className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            <Photo
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
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((e) => (
                <li key={e.slug}>
                  <a
                    href={e.url}
                    className="flex h-full min-h-11 flex-col gap-2 rounded-2xl border border-line-subtle p-5 text-fg no-underline hover:border-line"
                  >
                    <time dateTime={e.start} className="font-display text-lg font-bold">
                      {e.date}
                    </time>
                    <span className="leading-snug">{e.title}</span>
                    <span className="sr-only"> {nav("external")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
