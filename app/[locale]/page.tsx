import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/hero/Hero";
import type { Locale } from "@/lib/i18n";

// Homepage = hero + three acts (CLAUDE.md §1). Acts arrive in step 5.
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main" tabIndex={-1}>
      <Hero />
    </main>
  );
}
