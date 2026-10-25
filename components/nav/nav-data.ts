import { getLocale, getTranslations } from "next-intl/server";
import { getContent } from "@/lib/content";
import { missionAnchor, SECTION } from "@/lib/sections";
import type { NavData } from "./types";

/** Server-only: builds the menu from content JSON so none of that JSON ships to the client. */
export async function getNavData(): Promise<NavData> {
  const t = await getTranslations("Nav");
  const { campuses, colleges, featuredStory, missions, naacGrade, nirf, programmes, site, studentWork } = getContent(await getLocale());
  const universityRank = nirf.ranks.find((r) => r.id === "university")?.rank;
  const camber = studentWork[0];

  return {
    labels: {
      primary: t("primary"),
      home: t("home"),
      menu: t("menu"),
      close: t("close"),
      language: t("language"),
      external: t("external"),
      apply: t("apply"),
    },
    apply: { label: t("applyLong"), href: site.admissions.applyUrl },
    enquiry: { label: t("enquiry"), href: "/admissions#enquiry" },
    sections: [
      {
        id: "study",
        label: t("study"),
        intro: t("studyIntro", { programmes: programmes.length, colleges: colleges.length }),
        groups: [
          {
            title: t("startHere"),
            links: [
              { label: t("findProgramme"), href: "/programmes" },
              { label: t("undergraduate"), href: "/programmes#level-ug" },
              { label: t("postgraduate"), href: "/programmes#level-pg" },
              { label: t("admissions"), href: "/admissions" },
              { label: t("enquiry"), href: "/admissions#enquiry" },
            ],
          },
          {
            title: t("byCollege"),
            links: colleges.map((c) => ({ label: c.shortName, href: `/programmes#${c.slug}` })),
          },
        ],
        feature: { eyebrow: t("callAdmissions"), title: site.admissions.phones[0]!.display, href: "/admissions" },
      },
      {
        id: "research",
        label: t("research"),
        intro: t("researchIntro"),
        groups: [
          {
            title: t("missions"),
            links: missions.map((m) => ({ label: m.name, href: `/#${missionAnchor(m.slug)}` })),
          },
          { title: t("researchNumbers"), links: [{ label: t("researchNumbers"), href: `/#${SECTION.research}` }] },
        ],
      },
      {
        id: "student-work",
        label: t("studentWork"),
        intro: t("studentWorkIntro"),
        groups: [
          {
            title: t("studentWork"),
            links: studentWork
              .filter((s) => !s.title.startsWith("TODO:"))
              .map((s) => ({ label: s.title, href: `/stories/${s.slug}` })),
          },
        ],
        feature: camber ? { eyebrow: t("featured"), title: camber.title, href: `/stories/${camber.slug}` } : undefined,
      },
      {
        id: "campuses",
        label: t("campuses"),
        intro: t("campusesIntro"),
        groups: [
          {
            title: t("ourCampuses"),
            links: campuses
              .filter((c) => c.kind === "campus")
              .map((c) => ({ label: c.name, href: `/campuses/${c.slug}` })),
          },
          {
            title: t("sisterUniversities"),
            links: campuses
              .filter((c) => c.kind === "sister")
              .map((c) => ({ label: c.name, href: `/campuses/${c.slug}` })),
          },
        ],
        feature: { eyebrow: t("virtualTour"), title: campuses.find((c) => c.isMain)?.name ?? "", href: site.virtualTourUrl },
      },
      {
        id: "about",
        label: t("about"),
        intro: t("aboutIntro", { naac: naacGrade, rank: universityRank ?? "—", year: nirf.year }),
        groups: [
          {
            title: t("institution"),
            links: [
              { label: t("rankings"), href: `/#${SECTION.rankings}` },
              { label: t("alumni"), href: `/#${SECTION.alumni}` },
              { label: t("thisWeek"), href: `/#${SECTION.thisWeek}` },
              { label: t("admissions"), href: "/admissions" },
            ],
          },
        ],
        feature: featuredStory
          ? { eyebrow: t("thisWeek"), title: featuredStory.title, href: `/stories/${featuredStory.slug}` }
          : undefined,
      },
    ],
  };
}
