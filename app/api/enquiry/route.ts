import { NextResponse, type NextRequest } from "next/server";
import { programmes } from "@/lib/content";
import { validateEnquiry } from "@/lib/enquiry";
import { routing } from "@/lib/i18n";

/**
 * POST /api/enquiry — admission enquiries.
 * JSON in → JSON out (the enhanced form). Form-encoded in (no JS) → 303 to the thank-you page.
 * Delivery: forwards to ENQUIRY_WEBHOOK_URL when set (CRM, Sheets, email relay…). Without it the response says
 * delivered:false and the UI tells the visitor plainly — we never pretend an enquiry reached admissions.
 * Personal data is never logged.
 */
const slugs = programmes.map((p) => p.slug);
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  if (hits.size > 500) {
    for (const [k, timestamps] of hits.entries()) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1]! >= WINDOW_MS) {
        hits.delete(k);
      }
    }
  }
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const isForm = !req.headers.get("content-type")?.includes("application/json");
  let body: Record<string, unknown>;
  try {
    body = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "badRequest" }, { status: 400 });
  }

  const locale = routing.locales.find((l) => l === body.locale) ?? routing.defaultLocale;
  const thanks = new URL(`${locale === routing.defaultLocale ? "" : `/${locale}`}/admissions/thanks`, req.url);
  const back = new URL(`${locale === routing.defaultLocale ? "" : `/${locale}`}/admissions#enquiry`, req.url);

  // Honeypot: real people never fill the hidden "website" field. Answer as if it worked.
  if (typeof body.website === "string" && body.website.trim()) {
    return isForm ? NextResponse.redirect(thanks, 303) : NextResponse.json({ ok: true, delivered: false, ref: "—" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return isForm ? NextResponse.redirect(back, 303) : NextResponse.json({ ok: false, error: "rateLimited" }, { status: 429 });
  }

  const result = validateEnquiry(body, slugs);
  if (!result.ok) {
    // No-JS visitors already had the browser's required/pattern checks; send them back to the form.
    return isForm ? NextResponse.redirect(back, 303) : NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const ref = `ENQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  let delivered = false;
  const webhook = process.env.ENQUIRY_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref, receivedAt: new Date().toISOString(), ...result.data }),
        signal: AbortSignal.timeout(5000),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
  }
  console.info(`[enquiry] ${ref} delivered=${delivered}`);

  return isForm ? NextResponse.redirect(thanks, 303) : NextResponse.json({ ok: true, delivered, ref });
}
