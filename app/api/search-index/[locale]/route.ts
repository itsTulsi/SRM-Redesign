import lexicon from "@/content/lexicon.json";
import { getContent } from "@/lib/content";
import { routing } from "@/lib/i18n";
import { toSearchDocs } from "@/lib/search";

/**
 * Static search index per language (built once, served from the CDN): the hero fetches it together with Fuse
 * on first use instead of embedding ~23 kB of docs + lexicon in every homepage's HTML.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { programmes, colleges, campuses } = getContent(locale);
  const { _note, ...lex } = lexicon;
  void _note;
  return Response.json({ docs: toSearchDocs(programmes, colleges, campuses), lexicon: lex });
}
