import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LiteModeToggle } from "@/components/ui/LiteModeToggle";
import type { Locale } from "@/lib/i18n";

// Step 1 placeholder: proves tokens, fonts, locales and Lite Mode. Replaced by the hero in step 4.
export default function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <main id="main" tabIndex={-1} data-surface="dark" className="min-h-dvh bg-bg py-24 text-fg">
      <div className="site-grid gap-y-10">
        <h1 className="col-span-full font-display text-act font-bold uppercase">{t("tagline")}</h1>
        <p className="col-span-full max-w-prose text-fg-muted md:col-span-6">{t("scaffoldNote")}</p>
        <div className="col-span-full">
          <LiteModeToggle />
        </div>
      </div>
    </main>
  );
}
