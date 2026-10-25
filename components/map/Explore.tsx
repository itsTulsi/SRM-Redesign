import { getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { campuses } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";

/**
 * Explore. This campus list is the complete, accessible version — and stays as the Lite Mode / no-JS
 * fallback when the constellation map (step 9) is layered on top.
 */
export async function Explore() {
  const t = await getTranslations("Acts.explore");
  const nav = await getTranslations("Nav");
  const own = campuses.filter((c) => c.kind === "campus");
  const sisters = campuses.filter((c) => c.kind === "sister");
  const main = own.find((c) => c.isMain);
  const rest = own.filter((c) => !c.isMain);

  return (
    <section id={SECTION.explore} aria-labelledby="explore-title" data-surface="dark" className="bg-bg py-24 text-fg lg:py-36">
      <div className="site-container">
        <h2 id="explore-title" className="font-display text-hero font-bold text-balance">
          {t("title")}
        </h2>
        <p className="mt-4 max-w-prose text-lg text-fg-muted">{t("intro")}</p>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          {main ? (
            <article aria-labelledby={`campus-${main.slug}`} className="overflow-hidden rounded-3xl border border-line-subtle lg:col-span-7">
              <Photo src={main.photo} alt={`${main.name} campus`} sizes="(min-width: 1024px) 58vw, 100vw" className="aspect-[16/10] w-full" />
              <div className="flex flex-col gap-4 p-6 lg:p-8">
                <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("main")}</p>
                <h3 id={`campus-${main.slug}`} className="font-display text-4xl font-bold">
                  {main.name}
                </h3>
                <p className="text-fg-muted">
                  {main.city}, {main.state}
                </p>
                <div className="flex flex-wrap gap-3">
                  {main.tour360Url ? (
                    <a
                      href={main.tour360Url}
                      data-magnetic
                      className="relative inline-flex min-h-11 overflow-hidden items-center rounded-full bg-fg px-5 font-semibold text-bg no-underline"
                    >
                      {t("tour")}
                      <span className="sr-only"> {nav("external")}</span>
                    </a>
                  ) : null}
                  <Link
                    href={`/campuses/${main.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg"
                  >
                    {t("visit")}
                  </Link>
                </div>
              </div>
            </article>
          ) : null}

          <ul className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            {rest.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/campuses/${c.slug}`}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-2xl border border-line-subtle px-5 py-4 text-fg no-underline hover:border-line"
                >
                  <span>
                    <span className="block text-lg font-semibold">{c.name}</span>
                    <span className="block text-sm text-fg-muted">
                      {c.city}, {c.state}
                    </span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <h3 className="mt-14 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("sisters")}</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {sisters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/campuses/${c.slug}`}
                className="flex min-h-11 flex-col rounded-2xl border border-line-subtle px-5 py-4 text-fg no-underline hover:border-line"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-fg-muted">
                  {c.city}, {c.state}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
