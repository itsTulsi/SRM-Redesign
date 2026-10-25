import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StreetMap } from "@/components/map/StreetMap";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { campuses, getContent, isTodo } from "@/lib/content";
import { directionsUrl, streetMap } from "@/lib/map";
import { Link, type Locale } from "@/lib/i18n";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export function generateStaticParams() {
  return campuses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const campus = getContent(locale).getCampus(slug);
  if (!campus) return {};
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: `${campus.kind === "sister" ? campus.name : t("campusTitle", { name: campus.name })} — SRMIST` };
}

// Basic campus page. The constellation map + in-page 360° modal (step 9) link here.
export default async function CampusPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { colleges, getCampus } = getContent(locale);
  const campus = getCampus(slug);
  if (!campus) notFound();
  const t = await getTranslations("Pages");
  const nav = await getTranslations("Nav");
  const here = colleges.filter((c) => c.campus === campus.slug);
  const ex = await getTranslations("Acts.explore");
  const street = streetMap(campus);

  return (
    <main id="main" tabIndex={-1} className="site-container py-12 lg:py-20">
      <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
        {campus.kind === "sister" ? nav("sisterUniversities") : nav("ourCampuses")}
      </p>
      <h1 className="mt-2 font-display text-hero font-bold">
        {campus.kind === "sister" ? campus.name : t("campusTitle", { name: campus.name })}
      </h1>
      <p className="mt-4 text-lg text-fg-muted">
        {campus.city}, {campus.state}
        {campus.distanceFromChennai ? (
          <>
            {" · "}
            <Fact value={campus.distanceFromChennai} />
          </>
        ) : null}
      </p>

      <Photo
        src={campus.photo}
        alt={`${campus.name} campus`}
        sizes="(min-width: 1440px) 1344px, 100vw"
        priority
        className="mt-10 aspect-[16/9] w-full rounded-2xl"
      />

      <div className="mt-10">
        {campus.tour360Url ? (
          <a
            href={campus.tour360Url}
            className="inline-flex min-h-12 items-center rounded-full border border-line px-6 font-semibold text-fg no-underline hover:border-fg"
          >
            {t("openTour")}
            <span className="sr-only"> {nav("external")}</span>
          </a>
        ) : (
          <p className="text-fg-muted">{t("noTour")}</p>
        )}
      </div>

      <section aria-labelledby="h-find-us" className="mt-14 grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <h2 id="h-find-us" className="font-display text-section font-bold">
            {t("findUs")}
          </h2>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("address")}</h3>
            <p className="mt-1 text-lg">
              {isTodo(campus.address) ? (
                <>
                  {campus.city}, {campus.state} <Fact value={campus.address} />
                </>
              ) : (
                <span lang="en">{campus.address}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={directionsUrl(campus)}
              className="inline-flex min-h-11 items-center rounded-full bg-fg px-5 font-semibold text-bg no-underline"
            >
              {ex("directions")}
            </a>
            <a
              href={campus.website}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg"
            >
              {ex("website")}
            </a>
          </div>
          {campus.coordsApprox ? <p className="text-sm text-fg-muted">{ex("approx")}</p> : null}
        </div>
        <StreetMap
          image={street.image}
          link={street.link}
          alt={`${ex("streetMap")}: ${campus.name}`}
          linkLabel={ex("openMap")}
          approx={campus.coordsApprox}
          className="lg:col-span-7"
        />
      </section>

      {here.length > 0 ? (
        <section aria-labelledby="h-colleges" className="mt-12">
          <h2 id="h-colleges" className="text-xl font-semibold">
            {t("collegesHere")}
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {here.map((c) => (
              <li key={c.slug}>
                <Link href={`/programmes#${c.slug}`} className="inline-flex min-h-11 items-center">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
