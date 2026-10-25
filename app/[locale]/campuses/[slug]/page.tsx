import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Fact } from "@/components/ui/Todo";
import { campuses, colleges, getCampus } from "@/lib/content";
import { Link, type Locale } from "@/lib/i18n";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export function generateStaticParams() {
  return campuses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const campus = getCampus(slug);
  if (!campus) return {};
  const t = await getTranslations({ locale, namespace: "Pages" });
  return { title: `${campus.kind === "sister" ? campus.name : t("campusTitle", { name: campus.name })} — SRMIST` };
}

// Basic campus page. The constellation map + in-page 360° modal (step 9) link here.
export default async function CampusPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const campus = getCampus(slug);
  if (!campus) notFound();
  const t = await getTranslations("Pages");
  const nav = await getTranslations("Nav");
  const here = colleges.filter((c) => c.campus === campus.slug);

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

      <MediaPlaceholder
        description={`${campus.name} campus`}
        file={campus.photo}
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
