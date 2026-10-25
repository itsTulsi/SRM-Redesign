/**
 * Validates content/*.json before every build (npm "prebuild"). Fails loudly on broken references,
 * wrong types, or a "TODO" hidden mid-string (which isTodo() would miss and render as if verified).
 * Runs on Node's built-in type stripping: `node scripts/check-content.mts`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = Record<string, Json>;

const dir = join(import.meta.dirname, "..", "content");
const load = (name: string) => JSON.parse(readFileSync(join(dir, name), "utf8")) as Obj;
const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

const isTodo = (v: Json | undefined) => typeof v === "string" && v.startsWith("TODO:");
const isStr = (v: Json | undefined) => typeof v === "string" && v.length > 0;
const isNum = (v: Json | undefined) => typeof v === "number" && Number.isFinite(v);
const arr = (v: Json | undefined) => (Array.isArray(v) ? v : []);

const files = {
  site: load("site.json"),
  programmes: load("programmes.json"),
  colleges: load("colleges.json"),
  campuses: load("campuses.json"),
  stats: load("stats.json"),
  alumni: load("alumni.json"),
  stories: load("stories.json"),
  research: load("research.json"),
};

// ── Every "TODO" must be a leading "TODO:" so the UI can detect it; count them per file ──
const todoCounts: Record<string, number> = {};
function scanTodos(file: string, value: Json, path: string) {
  if (typeof value === "string") {
    const isNoteKey = /(^_|Note$)/.test(path.split(".").pop() ?? "") || path.includes("._sources");
    if (isNoteKey) return;
    if (value.startsWith("TODO:")) todoCounts[file] = (todoCounts[file] ?? 0) + 1;
    else if (value.includes("TODO")) fail(`${file}.json ${path}`, `"TODO" must start the string ("TODO: …"), got "${value}"`);
  } else if (Array.isArray(value)) value.forEach((v, i) => scanTodos(file, v, `${path}[${i}]`));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) scanTodos(file, v, path ? `${path}.${k}` : k);
}
for (const [name, data] of Object.entries(files)) scanTodos(name, data, "");

// ── Reference sets ──
const campusSlugs = new Set(arr(files.campuses.campuses).map((c) => (c as Obj).slug));
const collegeSlugs = new Set(arr(files.colleges.colleges).map((c) => (c as Obj).slug));
const storySlugs = new Set(arr(files.stories.stories).map((s) => (s as Obj).slug));

function uniqueSlugs(file: string, items: Json[]) {
  const seen = new Set<Json | undefined>();
  for (const item of items) {
    const slug = (item as Obj).slug;
    if (!isStr(slug) || !/^[a-z0-9-]+$/.test(slug as string)) fail(file, `bad slug ${JSON.stringify(slug)}`);
    if (seen.has(slug)) fail(file, `duplicate slug "${slug}"`);
    seen.add(slug);
  }
}

// ── Programmes ──
const programmes = arr(files.programmes.programmes) as Obj[];
uniqueSlugs("programmes.json", programmes);
for (const p of programmes) {
  const at = `programmes.json ${p.slug}`;
  for (const key of ["name", "summary"]) if (!isStr(p[key])) fail(at, `${key} missing`);
  if (!collegeSlugs.has(p.college)) fail(at, `unknown college "${p.college}"`);
  const pc = arr(p.campuses);
  if (pc.length === 0) fail(at, "campuses empty");
  for (const c of pc) if (!campusSlugs.has(c)) fail(at, `unknown campus "${c}"`);
  if (p.level !== "UG" && p.level !== "PG") fail(at, `level must be UG|PG`);
  for (const key of ["durationYears", "feesPerYearINR"])
    if (!isNum(p[key]) && !isTodo(p[key])) fail(at, `${key} must be a number or "TODO: …"`);
  for (const key of ["eligibility", "entrance", "deadline"]) if (!isStr(p[key])) fail(at, `${key} missing`);
  if (arr(p.tags).length < 3) fail(at, "needs at least 3 search tags");
  if (arr(p.outcomes).length === 0) fail(at, "outcomes empty");
  if (arr(p.sources).length === 0) fail(at, "sources empty — every programme needs a citation");
}

// ── Colleges / campuses ──
uniqueSlugs("colleges.json", arr(files.colleges.colleges));
for (const c of arr(files.colleges.colleges) as Obj[]) {
  if (!campusSlugs.has(c.campus)) fail(`colleges.json ${c.slug}`, `unknown campus "${c.campus}"`);
  if (!programmes.some((p) => p.college === c.slug)) fail(`colleges.json ${c.slug}`, "no programmes reference it");
}
uniqueSlugs("campuses.json", arr(files.campuses.campuses));
for (const c of arr(files.campuses.campuses) as Obj[]) {
  if (!isNum(c.lat) || !isNum(c.lng)) fail(`campuses.json ${c.slug}`, "lat/lng must be numbers");
  if (c.kind !== "campus" && c.kind !== "sister") fail(`campuses.json ${c.slug}`, "kind must be campus|sister");
  if (!isStr(c.website) || !String(c.website).startsWith("https://")) fail(`campuses.json ${c.slug}`, "website must be an https URL");
  if (!isStr(c.directionsQuery)) fail(`campuses.json ${c.slug}`, "directionsQuery missing");
  if (!isStr(c.address)) fail(`campuses.json ${c.slug}`, "address missing (use TODO: …)");
}
for (const cl of arr(files.campuses.clusters) as Obj[])
  for (const m of arr(cl.members)) if (!campusSlugs.has(m)) fail(`campuses.json cluster ${cl.id}`, `unknown member "${m}"`);

// ── Stories / events ──
uniqueSlugs("stories.json", arr(files.stories.stories));
if (!storySlugs.has(files.stories.featured)) fail("stories.json", `featured "${files.stories.featured}" not found`);
for (const s of arr(files.stories.studentWork)) if (!storySlugs.has(s)) fail("stories.json", `studentWork "${s}" not found`);
for (const e of arr(files.stories.events) as Obj[]) {
  const at = `stories.json event ${e.slug}`;
  if (e.campus !== undefined && !campusSlugs.has(e.campus)) fail(at, `unknown campus "${e.campus}"`);
  for (const key of ["start", "end"])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e[key]))) fail(at, `${key} must be an ISO date (YYYY-MM-DD)`);
}

// ── Stats: numbers must be numbers and match their display string ──
const statsObj = files.stats as Obj;
for (const group of ["placements", "research"]) {
  for (const s of arr((statsObj[group] as Obj).items) as Obj[]) {
    const at = `stats.json ${group}.${s.id}`;
    if (!isNum(s.value) || !isStr(s.display)) fail(at, "needs numeric value and display string");
    const digits = String(s.display).replace(/[^0-9.]/g, "");
    if (Number(digits) !== s.value) fail(at, `display "${s.display}" doesn't match value ${s.value}`);
  }
}
const nirf = statsObj.nirf as Obj;
if (!(nirf.years as Obj)[nirf.current as string]) fail("stats.json", `nirf.current "${nirf.current}" has no data`);

// ── Report ──
if (errors.length) {
  console.error(`✖ content check failed (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
const total = Object.values(todoCounts).reduce((a, b) => a + b, 0);
console.log(
  `✓ content OK — ${programmes.length} programmes, ${collegeSlugs.size} colleges, ${campusSlugs.size} campuses. ` +
    `${total} TODOs: ` +
    Object.entries(todoCounts)
      .map(([f, n]) => `${f} ${n}`)
      .join(", "),
);
