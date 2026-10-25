import { getTranslations } from "next-intl/server";
import { SmartLink } from "@/components/ui/SmartLink";
import { campuses, colleges, programmes, site } from "@/lib/content";
import { toSearchDocs } from "@/lib/search";
import { SECTION } from "@/lib/sections";
import { HeroSeed } from "@/components/tree/HeroSeed";
import { HeroMedia } from "./HeroMedia";
import { HeroSearch } from "./HeroSearch";

export async function Hero() {
  const t = await getTranslations("Hero");
  const nav = await getTranslations("Nav");
  const docs = toSearchDocs(programmes, colleges, campuses);
  const counts = {
    programmes: programmes.length,
    colleges: colleges.length,
    campuses: campuses.filter((c) => c.kind === "campus").length,
  };

  // TODO(step 11): "Parents" switches on Parent Mode instead of linking to admissions.
  const audiences = [
    { label: t("students"), href: "/programmes" },
    { label: t("parents"), href: "/admissions" },
    { label: t("international"), href: site.admissions.internationalUrl },
    { label: t("research"), href: `/#${SECTION.research}` },
    { label: t("alumni"), href: `/#${SECTION.alumni}` },
  ];

  return (
    <section
      aria-labelledby="hero-title"
     
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-end overflow-hidden bg-bg text-fg"
    >
      <HeroMedia />
      <div className="site-container w-full pt-16 pb-8 lg:pb-12">
        <h1 id="hero-title" className="max-w-[16ch] font-display text-hero font-bold text-balance">
          {t("title")}
        </h1>

        <HeroSearch docs={docs} counts={counts} phone={site.admissions.phones[0]!} />

        <nav aria-label={t("audienceLabel")} className="mt-6">
          <ul className="flex flex-wrap items-center gap-2">
            <li aria-hidden="true" className="mr-1 text-sm text-fg-muted">
              {t("audienceLabel")}
            </li>
            {audiences.map((a) => (
              <li key={a.label}>
                <SmartLink
                  href={a.href}
                  externalHint={nav("external")}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-fg no-underline hover:border-fg hover:bg-fg hover:text-bg"
                >
                  {a.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <HeroSeed />
    </section>
  );
}
