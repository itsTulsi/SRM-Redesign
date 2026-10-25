import { getLocale, getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { getContent, isTodo } from "@/lib/content";
import { SECTION } from "@/lib/sections";
import { ActHeader } from "./ActHeader";
import { StatFigure } from "./StatFigure";

export async function ActLead() {
  const t = await getTranslations("Acts.lead");
  const locale = await getLocale();
  const { alumni, placements } = getContent(locale);

  return (
    <section id={SECTION.lead} aria-labelledby="act-lead" data-act="lead" className="relative bg-bg text-fg">
      <div data-curtain aria-hidden="true" className="act-curtain" />
      <ActHeader id="act-lead" kicker={t("kicker")} word={t("word")} title="Lead" question={t("question")} locale={locale} />

      {/* Alumni as people (face, one line, path) — not a logo wall. */}
      <div id={SECTION.alumni} className="site-container pb-20 lg:pb-32">
        <h3 className="font-display text-section font-bold">{t("alumniTitle")}</h3>
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-6">
          {alumni.map((a) => (
            <li key={a.slug} className="flex flex-col gap-4">
              <Photo src={a.photo} alt={`Portrait of ${a.name}`} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-square w-full rounded-3xl" />
              <div>
                <h4 className="font-display text-2xl font-bold">{a.name}</h4>
                <p className="mt-1 text-lg">{a.role}</p>
              </div>
              {isTodo(a.line) ? (
                <Fact value={a.line} />
              ) : (
                <blockquote className="border-l-2 border-tree pl-4 text-lg text-fg-muted">“{a.line}”</blockquote>
              )}
              <ol aria-label={t("pathLabel", { name: a.name })} className="flex flex-col gap-1.5 border-l border-line pl-4 text-sm text-fg-muted">
                <li>
                  SRM · <Fact value={a.degree} />
                </li>
                {a.path.map((step) => (
                  <li key={step}>
                    <Fact value={step} />
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </div>

      <div id={SECTION.placements} className="site-container pb-24 lg:pb-40">
        <h3 className="font-display text-section font-bold">{t("placementsTitle", { season: placements.season })}</h3>
        <p className="mt-3 max-w-prose text-fg-muted">{t("placementsIntro")}</p>
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
          {placements.items.map((s) => (
            <StatFigure key={s.id} stat={s} />
          ))}
        </dl>
      </div>
    </section>
  );
}
