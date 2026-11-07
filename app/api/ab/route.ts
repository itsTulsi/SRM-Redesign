import { NextResponse, type NextRequest } from "next/server";
import { EXPERIMENTS, type ExperimentId } from "@/lib/ab";
import { abSummary, type Counts } from "@/lib/ab-stats";

/**
 * A/B events (lib/ab.ts). POST {e, v, t: "view"|"goal", p} counts one event; GET returns the totals with conversion
 * rates and a two-proportion z-test. Counts live in this server instance's memory (they reset on a redeploy or cold
 * start); every event is also written to the server log as one JSON line, so the full record survives in the
 * platform's logs. No cookies, no IP stored, nothing personal: only the experiment, the variant and the page path.
 */
const counts: Counts = Object.fromEntries(
  Object.entries(EXPERIMENTS).map(([e, x]) => [e, Object.fromEntries(x.variants.map((v) => [v, { views: 0, goals: 0 }]))]),
);

const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  if (hits.size > 2000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 60;
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (ip && limited(ip)) return new NextResponse(null, { status: 429 });
  let body: { e?: unknown; v?: unknown; t?: unknown; p?: unknown };
  try {
    body = JSON.parse((await req.text()).slice(0, 500));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const e = typeof body.e === "string" && body.e in EXPERIMENTS ? (body.e as ExperimentId) : null;
  const v = e && typeof body.v === "string" && (EXPERIMENTS[e].variants as readonly string[]).includes(body.v) ? body.v : null;
  const t = body.t === "view" || body.t === "goal" ? body.t : null;
  if (!e || !v || !t) return new NextResponse(null, { status: 400 });
  const path = typeof body.p === "string" ? body.p.slice(0, 120) : "";
  const c = counts[e]![v]!;
  if (t === "view") c.views++;
  else c.goals++;
  console.log(JSON.stringify({ ab: e, variant: v, event: t, path, at: new Date().toISOString() }));
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json(abSummary(counts), { headers: { "cache-control": "no-store" } });
}
