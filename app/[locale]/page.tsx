import { setRequestLocale } from "next-intl/server";
import { ActLead } from "@/components/acts/ActLead";
import { ActLeap } from "@/components/acts/ActLeap";
import { ActLearn } from "@/components/acts/ActLearn";
import { ThisWeek } from "@/components/acts/ThisWeek";
import { Hero } from "@/components/hero/Hero";
import { Explore } from "@/components/map/Explore";
import type { Locale } from "@/lib/i18n";

// Homepage = exactly the sections in CLAUDE.md §1, in order. Nothing else goes here.
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main" tabIndex={-1}>
      <Hero />
      <ActLearn />
      <ActLeap />
      <ActLead />
      <Explore />
      <ThisWeek />
    </main>
  );
}
