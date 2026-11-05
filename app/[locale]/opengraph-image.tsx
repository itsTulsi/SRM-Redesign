import { routing } from "@/lib/i18n";
import { nirfLine, OG_CONTENT_TYPE, OG_SIZE, ogContent, ogImage } from "@/lib/og";

/** The default link preview for every page that doesn't have its own. */
export const alt = "SRM Institute of Science and Technology: Learn. Leap. Lead.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function Image() {
  const { site } = ogContent();
  return ogImage({ eyebrow: site.location, title: site.name, badges: [nirfLine("university")] });
}
