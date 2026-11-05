import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { MotionDirector } from "@/components/motion/MotionDirector";
import { ViewTransitions } from "@/components/motion/ViewTransitions";
import { getNavData } from "@/components/nav/nav-data";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { CompareTray } from "@/components/programme/CompareTray";
import { HtmlState } from "@/components/ui/HtmlState";
import { OfflineSupport } from "@/components/ui/OfflineSupport";
import { SkipLink } from "@/components/ui/SkipLink";
import { fontVariables } from "@/lib/fonts";
import { routing } from "@/lib/i18n";
import { applyLiteMode, LITE_STORAGE_KEY } from "@/lib/lite-mode";
import { applyParentMode, PARENT_STORAGE_KEY } from "@/lib/parent-mode";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// Keep in sync with useTranslations() calls in "use client" components (check: grep -rl useTranslations).
const CLIENT_NAMESPACES = ["Lite", "Hero", "Ask", "Enquiry", "Senior", "Parent", "Assistant", "Palette", "Offline"] as const;

// Runs before first paint so Lite Mode and Parent Mode never flash. Failure is harmless: defaults apply.
const initScript = `try{(${applyLiteMode.toString()})(${JSON.stringify(LITE_STORAGE_KEY)})}catch(e){}try{(${applyParentMode.toString()})(${JSON.stringify(PARENT_STORAGE_KEY)})}catch(e){}`;

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
  // Only the namespaces client components use go to the browser; everything else renders on the server.
  // (Sending all messages cost ~40 kB raw per Tamil/Hindi page.)
  const all = await getMessages();
  const clientMessages = {
    ...Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, all[ns]])),
    Acts: { explore: all.Acts.explore },
    Compare: { ui: all.Compare.ui },
    Hostels: { finder: all.Hostels.finder, block: all.Hostels.block },
  };

  return (
    <html lang={locale} className={fontVariables(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body>
        <NextIntlClientProvider messages={clientMessages}>
          <HtmlState />
          <SkipLink label={t("skipToContent")} />
          <SiteHeader nav={nav} />
          {children}
          <SiteFooter />
          <MotionDirector />
          <ViewTransitions />
          <CompareTray />
          <AssistantLauncher call={nav.call} />
          <OfflineSupport />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
