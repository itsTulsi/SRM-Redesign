import { Inter, Noto_Sans_Devanagari, Noto_Sans_Tamil, Space_Grotesk } from "next/font/google";
import type { Locale } from "./i18n";

// next/font downloads these at build time and serves them from our own origin — no Google request at runtime.

export const fontText = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

// Script fonts are only attached (and only downloaded) on their own locale.
export const fontTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-noto-tamil",
  preload: false,
});

export const fontDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  variable: "--font-noto-devanagari",
  preload: false,
});

export function fontVariables(locale: Locale): string {
  const vars = [fontText.variable, fontDisplay.variable];
  if (locale === "ta") vars.push(fontTamil.variable);
  if (locale === "hi") vars.push(fontDevanagari.variable);
  return vars.join(" ");
}
