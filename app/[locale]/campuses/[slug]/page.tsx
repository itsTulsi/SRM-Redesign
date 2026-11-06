import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Crest, ghostPill, GrailChapter, GrailHero, GrailPage } from "@/components/grail/GrailPage";
import { StreetMap } from "@/components/map/StreetMap";
import { Photo } from "@/components/ui/Photo";
import { Fact } from "@/components/ui/Todo";
import { campuses, getContent, isTodo } from "@/lib/content";
import { directionsUrl, streetMap } from "@/lib/map";
import { Link, type Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export function generateStaticParams() {
  return campuses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const campus = getContent(locale).getCampus(slug);
  if (!campus) return {};
  const t = await getTranslations({ locale, namespace: "Pages" });
  const name = campus.kind === "sister" ? campus.name : t("campusTitle", { name: campus.name });
  const description = `${campus.city}, ${campus.state}`;
  return {
    title: `${name} — SRMIST`,
    alternates: alternatesFor(locale, `/campuses/${slug}`),
    ...socialFor(locale, { title: name, description, path: `/campuses/${slug}`, ownImage: true }),
  };
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

  const title = campus.kind === "sister" ? campus.name : t("campusTitle", { name: campus.name });
  const kicker = campus.kind === "sister" ? nav("sisterUniversities") : nav("ourCampuses");

  return (
    <GrailPage>
      <GrailHero
        kicker={kicker}
        title={title}
        lead={
          <p>
            {campus.city}, {campus.state}
            {/* In production a TODO renders nothing, so don't leave a dangling separator. */}
            {campus.distanceFromChennai && !(isTodo(campus.distanceFromChennai) && process.env.NODE_ENV === "production") ? (
              <>
                {" · "}
                <Fact value={campus.distanceFromChennai} />
              </>
            ) : null}
          </p>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          {campus.tour360Url ? (
            <a href={campus.tour360Url} className="grail-cta">
              {t("openTour")}
              <span className="sr-only"> {nav("external")}</span>
            </a>
          ) : (
            <p className="text-[var(--fg-muted)]">{t("noTour")}</p>
          )}
          <a href={directionsUrl(campus)} className={ghostPill}>
            {ex("directions")}
          </a>
          {campus.slug === "kattankulathur" ? (
            <Link href="/walk" className={ghostPill}>
              🚶 {nav("walk")}
            </Link>
          ) : null}
        </div>
        <Photo
          src={campus.photo}
          alt={`${campus.name} campus`}
          sizes="(min-width: 1440px) 1344px, 100vw"
          priority
          className="mt-12 aspect-[16/9] w-full rounded-[36px] md:aspect-[21/9]"
        />
      </GrailHero>

      <GrailChapter tone="light" kicker={kicker} level={2} title={t("findUs")} titleId="h-find-us">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <div className="grail-paper p-6">
              <h3 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("address")}</h3>
              <p className="mt-2 text-xl">
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
              <a href={directionsUrl(campus)} className="inline-flex min-h-12 items-center rounded-full bg-[#000000] px-6 font-semibold text-[#ffffff] no-underline">
                {ex("directions")}
              </a>
              <a href={campus.website} className={ghostPill}>
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
        </div>
      </GrailChapter>

      {here.length > 0 ? (
        <GrailChapter tone="lilac" kicker={kicker} level={3} title={t("collegesHere")} titleId="h-colleges" size="text-[clamp(2.2rem,6vw,5.5rem)]">
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {here.map((c) => (
              <li key={c.slug}>
                <Link href={`/programmes#${c.slug}`} className="grail-paper grail-paper-link flex min-h-11 items-center gap-4 p-5 font-semibold text-fg no-underline">
                  <Crest seed={c.slug} className="size-11" />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </GrailChapter>
      ) : null}
    </GrailPage>
  );
}
