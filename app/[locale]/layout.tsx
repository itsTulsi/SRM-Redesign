import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SkipLink } from "@/components/ui/SkipLink";
import { fontVariables } from "@/lib/fonts";
import { routing } from "@/lib/i18n";
import { applyLiteMode, LITE_STORAGE_KEY } from "@/lib/lite-mode";
import { applyTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Runs before first paint so theme and Lite Mode never flash. Failure is harmless: defaults apply.
const initScript = `try{(${applyTheme.toString()})(${JSON.stringify(THEME_STORAGE_KEY)});(${applyLiteMode.toString()})(${JSON.stringify(LITE_STORAGE_KEY)})}catch(e){}`;

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1b4d" },
  ],
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

  return (
    <html lang={locale} className={fontVariables(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <SkipLink label={t("skipToContent")} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
