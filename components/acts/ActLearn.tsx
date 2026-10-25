import { getLocale, getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { colleges, naacGrade, nirf, programmes } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";
import { ActHeader } from "./ActHeader";

const HEADLINE_RANKS = ["university", "engineering", "overall"];

export async function ActLearn() {
  const t = await getTranslations("Acts.learn");
  const locale = await getLocale();
  const headline = HEADLINE_RANKS.map((id) => nirf.ranks.find((r) => r.id === id)).filter((r) => r !== undefined);
  const others = nirf.ranks.filter((r) => !HEADLINE_RANKS.includes(r.id));

  return (
    <section id={SECTION.learn} aria-labelledby="act-learn" data-act="learn" className="relative bg-bg text-fg">
      <ActHeader id="act-learn" kicker={t("kicker")} word={t("word")} title="Learn" question={t("question")} locale={locale} />

      {/* College strip (VCU hover-reveal in step 7). Native horizontal scroll + snap: works with touch, trackpad, keyboard (Tab through links). */}
      <h3 className="sr-only">{t("strip")}</h3>
      <ul
        data-college-strip
        data-cursor-label={t("drag")}
        className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-6 md:scroll-px-8 md:px-8 lg:scroll-px-12 lg:px-12"
      >
        {colleges.map((college) => {
          const count = programmes.filter((p) => p.college === college.slug).length;
          return (
            <li key={college.slug} className="w-[78vw] max-w-[22rem] shrink-0 snap-start">
              <Link
                href={`/programmes#${college.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line-subtle bg-bg text-fg no-underline hover:border-line"
              >
                <div className="overflow-hidden">
                  <Photo src={college.photo} alt={college.name} sizes="(min-width: 768px) 352px, 78vw" className="college-media aspect-[4/3] w-full" />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <p className="text-sm text-fg-muted">{t("programmes", { count })}</p>
                    <h4 className="mt-1 text-lg leading-snug font-semibold">{college.name}</h4>
                  </div>
                  <p className="college-outcome mt-auto flex flex-col">
                    <span className="font-display text-4xl leading-none font-bold">
                      <Fact value={college.outcome.value} fallback={count} />
                    </span>
                    <span className="mt-1 text-sm text-fg-muted">
                      <Fact value={college.outcome.label} fallback={t("programmes", { count })} />
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div id={SECTION.rankings} className="site-container py-20 lg:py-28">
        <h3 className="font-display text-section font-bold">{t("rankingsTitle")}</h3>
        <p className="mt-3 max-w-prose text-fg-muted">{t("rankingsIntro", { year: nirf.year })}</p>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {headline.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 border-t border-line pt-4">
              <dt className="order-2 text-fg-muted">
                NIRF {nirf.year} · {r.label}
              </dt>
              <dd className="order-1 font-display text-[clamp(3rem,8vw,6rem)] leading-none font-bold tabular-nums">
                <span className="text-fg-muted">#</span>
                {r.rank}
              </dd>
            </div>
          ))}
          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <dt className="order-2 text-fg-muted">{t("naac")}</dt>
            <dd className="order-1 font-display text-[clamp(3rem,8vw,6rem)] leading-none font-bold">{naacGrade}</dd>
          </div>
        </dl>

        <h4 className="mt-14 text-sm font-semibold tracking-wide text-fg-muted uppercase">
          {t("moreRanks", { year: nirf.year })}
        </h4>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {others.map((r) => (
            <div key={r.id} className="flex items-baseline justify-between gap-3 border-b border-line-subtle pb-2">
              <dt>{r.label}</dt>
              <dd className="font-display text-xl font-bold tabular-nums">#{r.rank}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-fg-muted">
          <a href={nirf.source}>{t("source", { year: nirf.year })}</a>
        </p>
      </div>
    </section>
  );
}
