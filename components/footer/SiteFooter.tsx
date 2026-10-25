import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { LiteModeToggle } from "@/components/ui/LiteModeToggle";
import { SmartLink } from "@/components/ui/SmartLink";
import { campuses, site } from "@/lib/content";
import { SECTION } from "@/lib/sections";
import { FooterAccordion } from "./FooterAccordion";
import { ThemeToggle } from "./ThemeToggle";

type Group = { id: string; title: string; links: { label: string; href: string; detail?: string }[] };

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const external = nav("external");

  const groups: Group[] = [
    {
      id: "study",
      title: t("study"),
      links: [
        { label: nav("findProgramme"), href: "/programmes" },
        { label: nav("undergraduate"), href: "/programmes#level-ug" },
        { label: nav("postgraduate"), href: "/programmes#level-pg" },
        { label: nav("admissions"), href: "/admissions" },
        { label: nav("applyLong"), href: site.admissions.applyUrl },
      ],
    },
    {
      id: "explore",
      title: t("explore"),
      links: [
        ...campuses.filter((c) => c.kind === "campus").map((c) => ({ label: c.name, href: `/campuses/${c.slug}` })),
        { label: nav("virtualTour"), href: site.virtualTourUrl },
      ],
    },
    {
      id: "about",
      title: t("about"),
      links: [
        { label: nav("rankings"), href: `/#${SECTION.rankings}` },
        { label: nav("research"), href: `/#${SECTION.research}` },
        { label: nav("studentWork"), href: `/#${SECTION.studentWork}` },
        { label: nav("alumni"), href: `/#${SECTION.alumni}` },
        { label: nav("thisWeek"), href: `/#${SECTION.thisWeek}` },
      ],
    },
    {
      id: "statutory",
      title: t("statutory"),
      links: site.statutoryLinks.map((l) => ({ label: l.label, href: l.href })),
    },
    {
      id: "contact",
      title: t("contact"),
      links: site.admissions.phones.map((p) => ({ label: p.display, href: `tel:${p.tel}`, detail: p.label })),
    },
  ];

  return (
    <footer className="border-t border-line-subtle bg-bg text-fg">
      <h2 className="sr-only">{t("label")}</h2>
      <div className="site-container py-12 lg:py-16">
        <div className="mb-10 flex flex-col gap-2">
          <p className="font-display text-3xl font-bold tracking-tight">{site.tagline}</p>
          <p className="text-fg-muted">
            {site.name} · {site.location} · NAAC {site.accreditation.naac}
          </p>
        </div>

        <FooterAccordion className="grid gap-x-8 lg:grid-cols-5">
          {groups.map((g) => (
            <details key={g.id} open className="group border-b border-line-subtle lg:border-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold lg:min-h-0 lg:cursor-default lg:pb-3 lg:text-sm lg:tracking-wide lg:text-fg-muted lg:uppercase [&::-webkit-details-marker]:hidden">
                {g.title}
                <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 transition-transform group-open:rotate-180 lg:hidden">
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </summary>
              <ul className="pb-4">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <SmartLink
                      href={l.href}
                      externalHint={external}
                      className="inline-flex min-h-11 flex-col justify-center py-1 text-fg underline-offset-4 hover:underline lg:min-h-9"
                    >
                      <span>{l.label}</span>
                      {l.detail ? <span className="text-sm text-fg-muted">{l.detail}</span> : null}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </FooterAccordion>

        <section aria-labelledby="footer-settings" className="mt-10 flex flex-col gap-6 border-t border-line-subtle pt-8">
          <h3 id="footer-settings" className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
            {t("settings")}
          </h3>
          <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-10">
            <LanguageSwitcher label={nav("language")} landmark={false} />
            <ThemeToggle
              labels={{ legend: t("theme"), system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") }}
            />
            <LiteModeToggle />
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-1 text-sm text-fg-muted">
          <p>
            © {new Date().getFullYear()} {t("rights")}
          </p>
          <p>{t("concept")}</p>
        </div>
      </div>
    </footer>
  );
}
