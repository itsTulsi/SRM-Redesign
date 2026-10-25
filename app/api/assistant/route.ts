import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { reply, type Translate } from "@/lib/assistant";
import { routing } from "@/lib/i18n";

/**
 * GET /api/assistant?q=…&locale=ta — the free "Ask SRM" assistant. Rule-based, answers only from verified
 * content (see lib/assistant). Deterministic, so responses are CDN-cached: repeat questions cost nothing.
 */
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 300);
  const requested = req.nextUrl.searchParams.get("locale");
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  if (!query) return NextResponse.json({ error: "missing q" }, { status: 400 });

  const t = await getTranslations({ locale, namespace: "Assistant" });
  const answer = await reply(query, t as unknown as Translate, locale);
  return NextResponse.json(answer, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
