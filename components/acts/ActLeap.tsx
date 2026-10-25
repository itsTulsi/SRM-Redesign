import { getLocale, getTranslations } from "next-intl/server";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Fact, Todo } from "@/components/ui/Todo";
import { isTodo, missions, researchStats, studentWork, type Story } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { missionAnchor, SECTION } from "@/lib/sections";
import { ActHeader } from "./ActHeader";
import { StatFigure } from "./StatFigure";

export async function ActLeap() {
  const t = await getTranslations("Acts.leap");
  const locale = await getLocale();

  return (
    <section id={SECTION.leap} aria-labelledby="act-leap" data-surface="dark" data-act="leap" className="relative bg-bg text-fg">
      <div data-curtain aria-hidden="true" className="act-curtain" />
      <ActHeader id="act-leap" kicker={t("kicker")} word={t("word")} title="Leap" question={t("question")} locale={locale} />

      <div id={SECTION.studentWork}>
        <h3 className="sr-only">{t("studentWork")}</h3>
        {studentWork.map((story, i) => (
          <StudentWorkPanel key={story.slug} story={story} index={i} readLabel={t("readStory")} />
        ))}
      </div>

      <div id={SECTION.research} className="site-container py-20 lg:py-32">
        <h3 className="font-display text-section font-bold">{t("researchTitle")}</h3>
        <p className="mt-3 max-w-prose text-fg-muted">{t("researchIntro")}</p>

        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {missions.map((m) => {
            const verified = m.highlights.filter((h) => !isTodo(h));
            const todos = m.highlights.filter((h) => isTodo(h));
            return (
              <li
                key={m.slug}
                id={missionAnchor(m.slug)}
                className="flex flex-col overflow-hidden rounded-3xl border border-line-subtle"
              >
                <MediaPlaceholder description={`${m.name} research`} file={m.photo} className="aspect-[16/9] w-full" />
                <div className="flex flex-col gap-3 p-6 lg:p-8">
                  <h4 className="font-display text-3xl font-bold">{m.name}</h4>
                  <p className="text-lg text-fg-muted">{m.question}</p>
                  {verified.length > 0 ? (
                    <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
                      {verified.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                  {todos.map((h) => (
                    <p key={h}>
                      <Fact value={h} />
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>

        <h4 className="mt-20 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("researchNumbers")}</h4>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {researchStats.map((s) => (
            <StatFigure key={s.id} stat={s} size="md" />
          ))}
        </dl>
      </div>
    </section>
  );
}

/** One cinematic, near-full-screen panel per story. Camber becomes the pinned scroll scene in step 8. */
function StudentWorkPanel({ story, index, readLabel }: { story: Story; index: number; readLabel: string }) {
  // A story whose headline is still TODO is visible in dev only — never published as a placeholder.
  if (isTodo(story.title)) {
    return (
      <div className="site-container py-10">
        <Todo note={`${story.title.slice(5).trim()} — ${story.dek}`} />
      </div>
    );
  }

  const reversed = index % 2 === 1;
  return (
    <article
      aria-labelledby={`sw-${story.slug}`}
      data-student-work={story.slug}
      className="site-grid min-h-[80svh] items-center gap-y-8 py-12 lg:py-20"
    >
      <MediaPlaceholder
        description={story.title}
        file={story.media.video ?? story.media.photo}
        kind={story.media.video ? "video" : "photo"}
        className={`col-span-full aspect-[4/3] rounded-3xl md:aspect-[16/10] lg:col-span-7 ${reversed ? "lg:order-2" : ""}`}
      />
      <div className={`col-span-full flex flex-col gap-5 lg:col-span-5 ${reversed ? "lg:order-1" : ""}`}>
        <h4 id={`sw-${story.slug}`} className="font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] font-bold text-balance">
          {story.title}
        </h4>
        <p className="text-lg text-fg-muted">{story.dek}</p>
        {story.facts.length > 0 ? (
          <dl className="grid gap-x-6 gap-y-3 border-t border-line-subtle pt-5 sm:grid-cols-[max-content_1fr]">
            {story.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="font-semibold">{f.label}</dt>
                <dd className="text-fg-muted">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {story.people.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {story.people.map((p) => (
              <li key={p.name}>
                <span className="font-semibold">
                  <Fact value={p.name} />
                </span>{" "}
                · <Fact value={p.role} />
              </li>
            ))}
          </ul>
        ) : null}
        <Link
          href={`/stories/${story.slug}`}
          data-magnetic
          className="relative inline-flex min-h-11 w-fit overflow-hidden items-center gap-2 rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg"
        >
          {readLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
