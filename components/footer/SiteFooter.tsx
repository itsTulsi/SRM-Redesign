import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/nav/LanguageSwitcher";
import { ParentModeToggle } from "@/components/programme/ParentModeToggle";
import { LiteModeToggle } from "@/components/ui/LiteModeToggle";
import { SmartLink } from "@/components/ui/SmartLink";
import { Link } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { SECTION } from "@/lib/sections";
import { FooterAccordion } from "./FooterAccordion";

type Group = { id: string; title: string; links: { label: string; href: string; detail?: string }[] };

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const { campuses, site } = getContent(await getLocale());
  const nav = await getTranslations("Nav");
  const external = nav("external");
  const e = await getTranslations("Enquiry");
  const phone = site.admissions.phones[0]!;

  const groups: Group[] = [
    {
      id: "study",
      title: t("study"),
      links: [
        { label: nav("findProgramme"), href: "/programmes" },
        { label: nav("undergraduate"), href: "/programmes#level-ug" },
        { label: nav("postgraduate"), href: "/programmes#level-pg" },
        { label: nav("admissions"), href: "/admissions" },
        { label: nav("enquiry"), href: "/admissions#enquiry" },
        { label: nav("applyLong"), href: "/admissions#apply" },
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
        <section
          aria-labelledby="footer-enquiry"
          className="mb-14 flex flex-col gap-5 rounded-3xl border border-line p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8"
        >
          <div>
            <h3 id="footer-enquiry" className="font-display text-2xl font-bold lg:text-3xl">
              {e("cta")}
            </h3>
            <p className="mt-2 max-w-prose text-fg-muted">{e("ctaBody")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admissions#enquiry"
              data-magnetic
              className="relative inline-flex min-h-12 items-center overflow-hidden rounded-full bg-action px-6 font-semibold text-on-action no-underline"
            >
              {e("ctaButton")}
            </Link>
            <a
              href={`tel:${phone.tel}`}
              className="inline-flex min-h-12 items-center rounded-full border border-line px-6 font-semibold text-fg no-underline hover:border-fg"
            >
              {phone.display}
            </a>
          </div>
        </section>

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
            <ParentModeToggle />
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
