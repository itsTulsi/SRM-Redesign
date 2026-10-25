import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { MotionDirector } from "@/components/motion/MotionDirector";
import { getNavData } from "@/components/nav/nav-data";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { SkipLink } from "@/components/ui/SkipLink";
import { fontVariables } from "@/lib/fonts";
import { routing } from "@/lib/i18n";
import { applyLiteMode, LITE_STORAGE_KEY } from "@/lib/lite-mode";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Runs before first paint so Lite Mode never flashes. Failure is harmless: defaults apply.
const initScript = `try{(${applyLiteMode.toString()})(${JSON.stringify(LITE_STORAGE_KEY)})}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "Meta" });
  return {
    metadataBase: new URL(siteUrl),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: { en: "/", ta: "/ta", hi: "/hi", "x-default": "/" },
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1b4d",
  colorScheme: "dark",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("A11y");
  const nav = await getNavData();

  return (
    <html lang={locale} className={fontVariables(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <SkipLink label={t("skipToContent")} />
          <SiteHeader nav={nav} />
          {children}
          <SiteFooter />
          <MotionDirector />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
