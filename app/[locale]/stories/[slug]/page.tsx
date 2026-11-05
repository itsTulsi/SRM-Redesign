import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StoryVisual } from "@/components/acts/StoryVisual";
import { GrailHero, GrailPage, GrailStart } from "@/components/grail/GrailPage";
import { Fact } from "@/components/ui/Todo";
import { getContent, isTodo, stories } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

// Stories whose headline is still a TODO aren't published.
const published = stories.filter((s) => !isTodo(s.title));

export function generateStaticParams() {
  return published.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = getContent(locale).getStory(slug);
  return story
    ? {
        title: `${story.title} — SRMIST`,
        description: story.dek,
        alternates: alternatesFor(locale, `/stories/${slug}`),
        ...socialFor(locale, { title: story.title, description: story.dek, path: `/stories/${slug}`, type: "article", ownImage: true }),
      }
    : {};
}

export default async function StoryPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const story = getContent(locale).getStory(slug);
  if (!story || isTodo(story.title)) notFound();

  const g = await getTranslations("Acts");

  return (
    <GrailPage>
      <GrailHero kicker={g("thisWeek.title")} title={story.title} size="text-[clamp(2.3rem,6vw,5.5rem)]" lead={<p className="text-xl">{story.dek}</p>}>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          <Fact value={story.date} />
        </p>
        <StoryVisual story={story} sizes="(min-width: 1440px) 1344px, 100vw" priority className="mt-10 aspect-[16/9] w-full rounded-[36px] md:aspect-[21/9]" />
      </GrailHero>

      <article aria-labelledby="page-title" data-tone="light" className="grail-sheet relative">
        <div className="site-container py-16 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-5 text-lg">
              {story.body.map((para, i) => (
                <p key={i}>
                  <Fact value={para} />
                </p>
              ))}
            </div>

            {story.facts.length > 0 ? (
              <dl className="mt-12 grid gap-4 sm:grid-cols-2">
                {story.facts.map((f) => (
                  <div key={f.label} className="grail-paper flex flex-col gap-1 p-5">
                    <dt className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{f.label}</dt>
                    <dd className="text-lg font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {story.people.length > 0 ? (
              <ul className="mt-8 flex flex-col gap-2">
                {story.people.map((p) => (
                  <li key={p.name}>
                    <Fact value={p.name} /> — <Fact value={p.role} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </article>

      <GrailStart level={2} />
    </GrailPage>
  );
}
