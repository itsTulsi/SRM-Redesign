/**
 * Builds docs/translation-review.csv — every user-facing string with English, Tamil and Hindi side by side,
 * for native-speaker review (open it in Google Sheets / Excel). Covers UI strings (messages/*.json) and
 * content translations (content/i18n/*.json + the English source in content/*.json).
 *
 *   npm run i18n:review
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const root = join(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8")) as Record<string, Json>;

function flatten(obj: Json, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof obj === "string") out[prefix] = obj;
  else if (Array.isArray(obj)) obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (obj && typeof obj === "object")
    for (const [k, v] of Object.entries(obj)) if (!k.startsWith("_")) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const rows: string[][] = [["area", "key", "English", "Tamil (ta)", "Hindi (hi)", "Reviewer notes"]];

// UI strings
const [en, ta, hi] = ["en", "ta", "hi"].map((l) => flatten(read(`messages/${l}.json`)));
for (const key of Object.keys(en!)) rows.push(["ui", key, en![key]!, ta![key] ?? "", hi![key] ?? "", ""]);

// Content: English source text by the same keys the translation files use
const programmes = read("content/programmes.json").programmes as Record<string, Json>[];
const colleges = read("content/colleges.json").colleges as Record<string, Json>[];
const campuses = read("content/campuses.json").campuses as Record<string, Json>[];
const stories = read("content/stories.json").stories as Record<string, Json>[];
const missions = read("content/research.json").missions as Record<string, Json>[];
const english: Record<string, string> = {};
for (const p of programmes) {
  english[`programmes.${p.slug}.name`] = p.name as string;
  english[`programmes.${p.slug}.summary`] = p.summary as string;
  (p.outcomes as string[]).forEach((o, i) => (english[`programmes.${p.slug}.outcomes[${i}]`] = o));
  if (!(p.eligibility as string).startsWith("TODO")) english[`programmes.${p.slug}.eligibility`] = p.eligibility as string;
  if (!(p.entrance as string).startsWith("TODO")) english[`programmes.${p.slug}.entrance`] = p.entrance as string;
}
for (const c of colleges) {
  english[`colleges.${c.slug}.name`] = c.name as string;
  english[`colleges.${c.slug}.shortName`] = c.shortName as string;
  english[`colleges.${c.slug}.outcomeLabel`] = (c.outcome as Record<string, string>).label!;
}
for (const c of campuses) for (const k of ["name", "city", "state"]) english[`campuses.${c.slug}.${k}`] = c[k] as string;
for (const s of stories) {
  english[`stories.${s.slug}.title`] = s.title as string;
  english[`stories.${s.slug}.dek`] = s.dek as string;
  (s.body as string[]).forEach((b, i) => (english[`stories.${s.slug}.body[${i}]`] = b));
  for (const f of s.facts as Record<string, string>[]) {
    english[`stories.${s.slug}.facts.${f.key}.label`] = f.label!;
    english[`stories.${s.slug}.facts.${f.key}.value`] = f.value!;
  }
}
for (const m of missions) {
  english[`missions.${m.slug}.name`] = m.name as string;
  english[`missions.${m.slug}.question`] = m.question as string;
  (m.highlights as string[]).forEach((h, i) => (english[`missions.${m.slug}.highlights[${i}]`] = h));
}
const [cta, chi] = ["ta", "hi"].map((l) => flatten(read(`content/i18n/${l}.json`)));
for (const key of Object.keys(english)) {
  if (english[key]!.startsWith("TODO")) continue; // unverified English isn't translated yet
  rows.push(["content", key, english[key]!, cta![key] ?? "", chi![key] ?? "", ""]);
}
// Content keys that exist only in translation files (stat labels, alumni roles, seniors, phones …)
for (const key of Object.keys(cta!))
  if (!(key in english)) rows.push(["content", key, "(see content/*.json)", cta![key] ?? "", chi![key] ?? "", ""]);

const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs/translation-review.csv"), "﻿" + csv + "\n"); // BOM so Excel reads UTF-8
const missingTa = rows.slice(1).filter((r) => !r[3]).length;
const missingHi = rows.slice(1).filter((r) => !r[4]).length;
console.log(`✓ docs/translation-review.csv — ${rows.length - 1} strings · missing Tamil: ${missingTa} · missing Hindi: ${missingHi}`);
