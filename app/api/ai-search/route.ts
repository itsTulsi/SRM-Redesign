import { NextResponse, type NextRequest } from "next/server";
import { programmes } from "@/lib/content";
import { routing } from "@/lib/i18n";
import { askLLM, llmEnabled } from "@/lib/llm";

/**
 * GET /api/ai-search?q=…&locale=ta — AI-ranked programme search. The free LLM (lib/llm) reads the visitor's words
 * (any language, any phrasing) against the list of programmes and returns the best matches with a one-line reason.
 * It can only choose from our real programme slugs (anything else is dropped), and fees, dates and eligibility are
 * never taken from it: the page shows those from our own data. No LLM configured, or it fails → { enabled:false }
 * and the browser keeps its instant keyword search. Answers are cached at the CDN, so repeats cost nothing.
 */
const slugs = new Set(programmes.map((p) => p.slug));
// Compact on purpose: free LLM tiers meter tokens per minute (Groq: 8,000), so each search costs about 1,000.
const catalogue = programmes.map((p) => `${p.slug}: ${p.name}; ${p.tags.slice(0, 5).join(", ")}`).join("\n");

// Best-effort limiter (per server instance): this endpoint spends a free quota, so keep one visitor from draining it.
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  if (hits.size > 500) {
    for (const [k, timestamps] of hits.entries()) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1]! >= 60_000) {
        hits.delete(k);
      }
    }
  }
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
};

const LANG: Record<string, string> = { en: "English", ta: "Tamil", hi: "Hindi" };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 160);
  const requested = req.nextUrl.searchParams.get("locale");
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  if (q.length < 3) return NextResponse.json({ error: "missing q" }, { status: 400 });
  if (!llmEnabled()) return NextResponse.json({ enabled: false, picks: [] });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && limited(ip)) {
    return NextResponse.json({ enabled: false, picks: [] }, { status: 429 });
  }

  const text = await askLLM(
    `You are the search engine for SRM Institute of Science and Technology's programme finder. The visitor types what they want in any language. Pick the up to 5 programmes from the list that best fit what they mean (interests, careers, subjects), best first. Reply with ONLY compact JSON: {"picks":[{"slug":"<slug from the list>","why":"<max 12 words, in ${LANG[locale]}, why it fits>"}]}. Use only slugs from the list. If nothing fits, reply {"picks":[]}. Never mention fees, dates or eligibility.\n\nProgrammes (slug: name; topics):\n${catalogue}`,
    q,
    600,
  );
  if (!text) return NextResponse.json({ enabled: false, picks: [] });

  // Read each complete {"slug":…,"why":…} pair, so a reply that was cut short still yields its finished picks.
  const picks: { slug: string; why: string }[] = [];
  for (const m of text.matchAll(/"slug"\s*:\s*"([^"]+)"\s*,\s*"why"\s*:\s*"([^"]*)"/g)) {
    const slug = m[1]!;
    if (slugs.has(slug) && !picks.some((p) => p.slug === slug)) picks.push({ slug, why: m[2]!.slice(0, 120) });
    if (picks.length === 5) break;
  }
  return NextResponse.json({ enabled: true, picks }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
