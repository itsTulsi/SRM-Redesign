import assistantData from "@/content/assistant.json";
import lexiconData from "@/content/lexicon.json";
import { understand, type Lexicon } from "./ask";
import {
  campuses,
  colleges,
  events,
  getCampus,
  isTodo,
  naacGrade,
  nirf,
  placements,
  programmes,
  researchStats,
  site,
  type Campus,
  type Programme,
} from "./content";
import { directionsUrl } from "./map";
import { loadSearcher, tokenize, toSearchDocs, type Searcher } from "./search";

/**
 * "Ask SRM" — free, rule-based assistant (no AI, no external calls, no cost).
 * Recognises what is being asked (intents, en/ta/hi) plus which programme/campus, and answers ONLY from the
 * verified content files. Anything unverified is said to be unpublished; anything unrecognised is handed to a
 * person. Server-only (imports content); the route returns small, cacheable JSON blocks.
 */

export type Block =
  | { type: "text"; text: string }
  | { type: "facts"; title?: string; rows: { label: string; value: string }[]; source?: string }
  | { type: "links"; links: { label: string; href: string; external?: boolean }[] }
  | { type: "programmes"; items: { slug: string; name: string; meta: string; href: string }[] }
  | { type: "call"; phones: { display: string; tel: string; label: string }[] };

export type Reply = { blocks: Block[]; suggestions: string[] };
export type Translate = (key: string, values?: Record<string, string | number>) => string;

type Intent = keyof typeof assistantData.intents;
const lexicon = lexiconData as Lexicon;
const docs = toSearchDocs(programmes, colleges, campuses);
let searcherPromise: Promise<Searcher> | null = null;

const norm = (s: string) => s.normalize("NFC").toLowerCase();
const isLatin = (w: string) => /^[\p{Script=Latin}\d\s.'+#-]+$/u.test(w);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function found(q: string, word: string) {
  const w = norm(word);
  if (!isLatin(w)) return q.includes(w);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(w)}($|[^\\p{L}\\p{N}])`, "u").test(q);
}

// Multi-word programme tags ("cyber security", "machine learning") are subjects, not topics: remove them before
// topic detection so "cyber security course" isn't read as a campus-safety question.
const subjectPhrases = [...new Set(programmes.flatMap((p) => p.tags))].filter((tag) => tag.includes(" ")).map(norm);

function intentsIn(query: string): Intent[] {
  const q = subjectPhrases.reduce((text, phrase) => text.split(phrase).join(" "), norm(query));
  const hits: { intent: Intent; at: number }[] = [];
  for (const [intent, words] of Object.entries(assistantData.intents) as [Intent, Record<string, string[]>][]) {
    const all = [...(words.en ?? []), ...(words.ta ?? []), ...(words.hi ?? [])];
    const positions = all.filter((w) => found(q, w)).map((w) => q.indexOf(norm(w)));
    if (positions.length) hits.push({ intent, at: Math.min(...positions) });
  }
  // Answer in the order the visitor asked; at most three topics per message.
  return hits.sort((a, b) => a.at - b.at).map((h) => h.intent).slice(0, 3);
}

async function programmeIn(query: string): Promise<Programme | null> {
  searcherPromise ??= loadSearcher(docs);
  const search = await searcherPromise;
  const u = understand(query, lexicon);
  const words = tokenize(query);
  for (const d of search(u.searchText, 5)) {
    const p = programmes.find((x) => x.slug === d.slug)!;
    const name = norm(p.name);
    const matched =
      u.terms.some((t) => p.tags.includes(t.tag)) ||
      words.some((w) => p.tags.includes(w) || (w.length >= 3 && name.includes(w)));
    if (matched) return p;
  }
  return null;
}

const MAIN_CAMPUS = ["main campus", "main", "முதன்மை வளாகம்", "மெயின் கேம்பஸ்", "मुख्य कैंपस", "मेन कैंपस"];

function campusIn(query: string): Campus | null {
  const q = norm(query);
  if (MAIN_CAMPUS.some((w) => found(q, w))) return campuses.find((c) => c.isMain) ?? null;
  // Specific campus words only (not "Chennai", which covers three).
  const place = lexicon.places.find((p) => p.campuses.length === 1 && p.words.some((w) => found(q, w)));
  if (place) return getCampus(place.campuses[0]!) ?? null;
  const sister = campuses.find((c) => c.kind === "sister" && found(q, c.city));
  return sister ?? null;
}

const inr = new Intl.NumberFormat("en-IN");

export async function reply(query: string, t: Translate, locale: string): Promise<Reply> {
  const intents = intentsIn(query);
  const programme = await programmeIn(query);
  const campus = campusIn(query);
  const phones = site.admissions.phones.map((p) => ({ display: p.display, tel: p.tel, label: p.label }));
  const call = (n = 2): Block => ({ type: "call", phones: phones.slice(0, n) });
  const blocks: Block[] = [];
  const suggest = new Set<string>();
  const prefix = locale === "en" ? "" : `/${locale}`;
  const progLink = (p: Programme) => ({ label: t("programmePage", { name: p.name }), href: `${prefix}/programmes/${p.slug}` });
  const missing = t("notPublished");

  const needProgramme = () => {
    blocks.push({ type: "text", text: t("whichProgramme") });
    suggest.add(t("sFeesBds"));
    suggest.add(t("sEligibilityCse"));
  };

  for (const intent of intents) {
    switch (intent) {
      case "greeting":
        blocks.push({ type: "text", text: t("hello") });
        break;

      case "fees":
        if (!programme) {
          needProgramme();
          break;
        }
        blocks.push({
          type: "facts",
          title: programme.name,
          rows: [{ label: t("fees"), value: typeof programme.feesPerYearINR === "number" ? t("feesValue", { amount: inr.format(programme.feesPerYearINR) }) : missing }],
          source: programme.sources[0],
        });
        if (typeof programme.feesPerYearINR !== "number") blocks.push({ type: "text", text: t("feesUnknown") }, call());
        blocks.push({ type: "links", links: [progLink(programme)] });
        break;

      case "eligibility":
      case "entrance":
        if (!programme) {
          needProgramme();
          break;
        }
        blocks.push({
          type: "facts",
          title: programme.name,
          rows: [
            ...(intent === "eligibility" ? [{ label: t("eligibility"), value: isTodo(programme.eligibility) ? missing : programme.eligibility }] : []),
            { label: t("entrance"), value: isTodo(programme.entrance) ? missing : programme.entrance },
          ],
          source: programme.sources[0],
        });
        blocks.push({ type: "links", links: [progLink(programme)] });
        break;

      case "deadline":
        blocks.push({
          type: "facts",
          title: programme?.name,
          rows: [
            { label: t("status"), value: site.admissions.status },
            ...(programme ? [{ label: t("deadline"), value: isTodo(programme.deadline) ? missing : programme.deadline }] : []),
          ],
          source: site.admissions.applyUrl,
        });
        blocks.push({ type: "links", links: [{ label: t("applyPortal"), href: site.admissions.applyUrl, external: true }] });
        break;

      case "apply":
        blocks.push({ type: "text", text: t("applyText") });
        blocks.push({
          type: "links",
          links: [
            { label: t("applyPortal"), href: site.admissions.applyUrl, external: true },
            { label: t("enquiry"), href: `${prefix}/admissions${programme ? `?programme=${programme.slug}` : ""}#enquiry` },
            { label: t("international"), href: site.admissions.internationalUrl, external: true },
          ],
        });
        break;

      case "location": {
        const c = campus ?? (programme ? getCampus(programme.campuses[0]!) : null);
        if (!c) {
          blocks.push({ type: "text", text: t("locationAsk") });
          blocks.push({ type: "links", links: [{ label: t("allCampuses"), href: `${prefix}/#explore` }] });
          suggest.add(t("sWhereKtr"));
          suggest.add(t("sWhereVadapalani"));
          break;
        }
        blocks.push({
          type: "facts",
          title: c.name,
          rows: [{ label: t("address"), value: isTodo(c.address) ? `${c.city}, ${c.state}` : c.address }],
          source: c.website,
        });
        blocks.push({
          type: "links",
          links: [
            { label: t("directions"), href: directionsUrl(c), external: true },
            ...(c.kind === "campus" ? [{ label: t("campusPage"), href: `${prefix}/campuses/${c.slug}` }] : [{ label: t("website"), href: c.website, external: true }]),
          ],
        });
        break;
      }

      case "ranking":
        blocks.push({
          type: "facts",
          title: t("rankingTitle", { year: nirf.year }),
          rows: [
            ...nirf.ranks.slice(0, 6).map((r) => ({ label: r.label, value: `#${r.rank}` })),
            { label: t("naac"), value: naacGrade },
          ],
          source: nirf.source,
        });
        break;

      case "placements": {
        const s = (id: string) => placements.items.find((x) => x.id === id)?.display ?? "—";
        blocks.push({
          type: "facts",
          title: t("placementsTitle", { season: placements.season }),
          rows: placements.items.map((x) => ({ label: x.label, value: x.display })),
        });
        blocks.push({ type: "text", text: t("placementsNote", { companies: s("companies") }) });
        if (programme) blocks.push({ type: "text", text: t("typicalRoles", { name: programme.name, roles: programme.outcomes.join(", ") }) });
        break;
      }

      case "hostel":
        blocks.push({ type: "text", text: t("hostelText") });
        blocks.push({ type: "links", links: [{ label: t("hostels"), href: site.parentLinks.hostels, external: true }] }, call());
        break;

      case "safety": {
        const grievance = site.statutoryLinks.find((l) => l.id === "grievance")?.href;
        blocks.push({ type: "text", text: t("safetyText") });
        blocks.push({
          type: "links",
          links: [
            { label: t("antiRagging"), href: site.parentLinks.antiRagging, external: true },
            { label: t("safety"), href: site.parentLinks.campusSafety, external: true },
            ...(grievance ? [{ label: t("grievance"), href: grievance, external: true }] : []),
          ],
        });
        break;
      }

      case "scholarship":
        blocks.push({ type: "text", text: t("scholarshipText") }, call());
        break;

      case "programmes":
        // "cyber security course" names its subject: the programme suggestions below answer it better.
        if (programme || understand(query, lexicon).terms.length) break;
        blocks.push({ type: "text", text: t("programmesText", { programmes: programmes.length, colleges: colleges.length }) });
        blocks.push({ type: "links", links: [{ label: t("allProgrammes"), href: `${prefix}/programmes` }] });
        suggest.add(t("sRobots"));
        suggest.add(t("sDoctor"));
        break;

      case "contact":
        blocks.push({ type: "text", text: t("contactText") }, { type: "call", phones });
        blocks.push({ type: "links", links: [{ label: t("enquiry"), href: `${prefix}/admissions#enquiry` }] });
        break;

      case "events":
        blocks.push({ type: "text", text: t("eventsText") });
        blocks.push({ type: "links", links: events.map((e) => ({ label: `${e.date} — ${e.title}`, href: e.url, external: true })) });
        break;

      case "international":
        blocks.push({ type: "text", text: t("internationalText") });
        blocks.push({ type: "links", links: [{ label: t("international"), href: site.admissions.internationalUrl, external: true }] });
        break;

      case "tour":
        blocks.push({ type: "text", text: t("tourText") });
        blocks.push({
          type: "links",
          links: [
            { label: t("tour360"), href: site.virtualTourUrl, external: true },
            { label: t("allCampuses"), href: `${prefix}/#explore` },
          ],
        });
        break;

      case "research":
        blocks.push({ type: "facts", title: t("researchTitle"), rows: researchStats.map((r) => ({ label: r.label, value: r.display })) });
        break;
    }
  }

  // No topic, but an interest we recognise ("I like robots") → suggest programmes.
  const onlySoft = intents.every((i) => i === "greeting" || i === "programmes");
  if (!intents.length || (onlySoft && programme) || (onlySoft && understand(query, lexicon).terms.length)) {
    const u = understand(query, lexicon);
    if (u.terms.length || programme) {
      searcherPromise ??= loadSearcher(docs);
      const search = await searcherPromise;
      const items = search(u.searchText, 3)
        .map((d) => programmes.find((p) => p.slug === d.slug)!)
        .filter((p) => u.terms.some((t) => p.tags.includes(t.tag)) || p.slug === programme?.slug)
        .map((p) => ({
          slug: p.slug,
          name: p.name,
          meta: `${colleges.find((c) => c.slug === p.college)?.shortName ?? ""} · ${p.level}`,
          href: `${prefix}/programmes/${p.slug}`,
        }));
      if (items.length) {
        blocks.push({ type: "text", text: t("programmeMatches") }, { type: "programmes", items });
        suggest.add(t("sFeesFor", { name: items[0]!.name.split(" — ")[0]! }));
      }
    }
  }

  // Nothing verified to say → hand over to a person, with the question carried into the enquiry form.
  if (!blocks.length) {
    blocks.push({ type: "text", text: t("notSure") }, call());
    blocks.push({
      type: "links",
      links: [{ label: t("sendQuestion"), href: `${prefix}/admissions?message=${encodeURIComponent(query.slice(0, 300))}#enquiry` }],
    });
  }

  if (!suggest.size) [t("sApply"), t("sRanking"), t("sHostel")].forEach((s) => suggest.add(s));
  return { blocks, suggestions: [...suggest].slice(0, 3) };
}
