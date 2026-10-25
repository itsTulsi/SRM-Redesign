import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { StoryVisual } from "@/components/acts/StoryVisual";
import { Fact } from "@/components/ui/Todo";
import { getContent, isTodo, stories } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { alternatesFor } from "@/lib/page-metadata";

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
    ? { title: `${story.title} — SRMIST`, description: story.dek, alternates: alternatesFor(locale, `/stories/${slug}`) }
    : {};
}

export default async function StoryPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const story = getContent(locale).getStory(slug);
  if (!story || isTodo(story.title)) notFound();

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm text-fg-muted">
          <Fact value={story.date} />
        </p>
        <h1 className="mt-2 font-display text-section font-bold">{story.title}</h1>
        <p className="mt-4 text-xl text-fg-muted">{story.dek}</p>

        <StoryVisual story={story} sizes="(min-width: 768px) 768px, 100vw" priority className="mt-10 aspect-[16/9] w-full rounded-2xl" />

        <div className="mt-10 flex flex-col gap-5 text-lg">
          {story.body.map((para, i) => (
            <p key={i}>
              <Fact value={para} />
            </p>
          ))}
        </div>

        {story.facts.length > 0 ? (
          <dl className="mt-12 grid gap-x-8 gap-y-4 border-t border-line-subtle pt-8 sm:grid-cols-[max-content_1fr]">
            {story.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="font-semibold">{f.label}</dt>
                <dd className="text-fg-muted">{f.value}</dd>
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
      </article>
    </main>
  );
}
