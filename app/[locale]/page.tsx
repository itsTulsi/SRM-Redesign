import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActLead } from "@/components/acts/ActLead";
import { ActLeap } from "@/components/acts/ActLeap";
import { ActLearn } from "@/components/acts/ActLearn";
import { ThisWeek } from "@/components/acts/ThisWeek";
import { Hero } from "@/components/hero/Hero";
import { Explore } from "@/components/map/Explore";
import { LivingTree } from "@/components/tree/LivingTree";
import { getContent, upcomingEvents } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { alternatesFor, socialFor } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { alternates: alternatesFor(locale, ""), ...socialFor(locale, { title: t("title"), description: t("description"), path: "", ownImage: true }) };
}

// Rebuilt daily so "Coming up" drops events once they've passed.
export const revalidate = 86400;

// Homepage = exactly the sections in CLAUDE.md §1, in order. Nothing else goes here.
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { site, events: allEvents } = getContent(locale);
  const events = upcomingEvents(allEvents);
  // Structured data (CLAUDE.md §8): the university, and the real upcoming events from "This week".
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollegeOrUniversity",
        name: "SRM Institute of Science and Technology",
        alternateName: "SRMIST",
        slogan: site.tagline,
        url: "https://www.srmist.edu.in/",
        telephone: "+91-44-27417000",
        address: {
          "@type": "PostalAddress",
          streetAddress: "SRM Nagar",
          addressLocality: "Kattankulathur",
          addressRegion: "Tamil Nadu",
          postalCode: "603203",
          addressCountry: "IN",
        },
      },
      ...events.map((e) => ({
        "@type": "Event",
        name: e.title,
        startDate: e.start,
        endDate: e.end,
        url: e.url,
        eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "Place", name: "SRM Institute of Science and Technology" },
        organizer: { "@type": "CollegeOrUniversity", name: "SRM Institute of Science and Technology", url: "https://www.srmist.edu.in/" },
      })),
    ],
  };

  return (
    <main id="main" tabIndex={-1}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <ActLearn />
      <ActLeap />
      <ActLead />
      <Explore />
      <ThisWeek />
      <LivingTree />
    </main>
  );
}
