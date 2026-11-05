import { getLocale, getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { getContent } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";
import { ActHeader } from "./ActHeader";

const HEADLINE_RANKS = ["university", "engineering", "overall"];
const RANK_AXIS = [1, 20, 40, 60];
const rankPosition = (rank: number) => `${((Math.min(rank, 60) - 1) / 59) * 100}%`;

export async function ActLearn() {
  const t = await getTranslations("Acts.learn");
  const locale = await getLocale();
  const { colleges, naacGrade, nirf, programmes } = getContent(locale);
  const headline = HEADLINE_RANKS.map((id) => nirf.ranks.find((r) => r.id === id)).filter((r) => r !== undefined);
  const ranked = [...nirf.ranks].sort((a, b) => a.rank - b.rank);

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
        <p className="mt-2 max-w-prose text-fg-muted">{t("ladderNote")}</p>

        {/* One shared scale, so the categories can be read against each other. The number in each row is the data; the dot only places it. */}
        <div aria-hidden="true" className="mt-6 flex items-end text-sm text-fg-muted lg:gap-6">
          <span className="hidden shrink-0 lg:block lg:w-64" />
          <span className="flex flex-1 gap-4">
            <span className="relative block h-5 flex-1">
              {RANK_AXIS.map((tick) => (
                <span key={tick} className={`absolute tabular-nums ${tick === 60 ? "-translate-x-full" : tick === 1 ? "" : "-translate-x-1/2"}`} style={{ left: rankPosition(tick) }}>
                  #{tick}
                </span>
              ))}
            </span>
            <span className="w-12 shrink-0" />
          </span>
        </div>
        <dl className="border-t border-line">
          {ranked.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 py-2.5 lg:flex-row lg:items-center lg:gap-6">
              <dt className="shrink-0 lg:w-64">{r.label}</dt>
              <dd className="flex flex-1 items-center gap-4">
                <span aria-hidden="true" className="relative block h-px flex-1 bg-line-subtle">
                  <span className="rank-node absolute top-1/2 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tree" style={{ left: rankPosition(r.rank) }} />
                </span>
                <span className="w-12 shrink-0 text-right font-display text-xl font-bold tabular-nums">#{r.rank}</span>
              </dd>
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
