/**
 * What media does the site still need?  `npm run media:status`
 * Reads every media path from content/*.json (+ hero and Camber sequence) and reports ✓ present / ✗ missing.
 * Drop files into public/ under the listed paths, re-run, then rebuild — no code changes needed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findMedia, findSequence } from "../lib/media.ts";

const root = join(import.meta.dirname, "..");
const json = (f: string) => JSON.parse(readFileSync(join(root, "content", f), "utf8"));
const { colleges } = json("colleges.json");
const { campuses } = json("campuses.json");
const { alumni } = json("alumni.json");
const { missions } = json("research.json");
const { stories } = json("stories.json");

type Row = { path: string; what: string; spec: string; required: boolean; ok: boolean; note?: string };
const groups: [string, Row[]][] = [];
const file = (path: string, what: string, spec: string, required = true): Row => ({ path, what, spec, required, ok: !!findMedia(path) });

const camber = stories.find((s: { scene?: string }) => s.scene === "sequence");
const seq = findSequence(camber?.media.sequence);
groups.push([
  "Hero (homepage, first screen)",
  [
    file("media/hero/poster.jpg", "Hero poster — first frame of the campus loop", "1920×1080 JPG, < 400 KB"),
    file("media/hero/campus-loop.mp4", "Hero campus loop video (muted)", "1920×1080 H.264, 10–20 s seamless loop, no audio, < 8 MB"),
    file("media/hero/campus-loop.webm", "Same loop as WebM (optional, smaller)", "VP9/AV1, < 5 MB", false),
  ],
]);
groups.push([
  "Team Camber Racing scene",
  [
    {
      path: `${camber?.media.sequence}/{sm,lg}/`,
      what: "Car video → scroll frames (run scripts/make-sequence.sh car.mp4)",
      spec: "Source: 4–8 s turntable spin or slow drive-by, 1080p+, steady camera, car centred",
      required: true,
      ok: !!seq,
      note: seq ? `${seq.count} frames` : undefined,
    },
    file(camber?.media.photo, "Camber poster (shown in Lite Mode / reduced motion)", "1920×1080 JPG of the car"),
    file(camber?.media.model, "Low-poly 3D model for the R3F upgrade (optional)", "GLB, < 2 MB, Draco-compressed", false),
    file(camber?.media.video, "Race footage for the story page (optional)", "1080p H.264 with captions .vtt", false),
  ],
]);
groups.push([
  "Act I — colleges strip (one per college)",
  colleges.map((c: { photo: string; name: string }) => file(c.photo, c.name, "4:3 landscape, ≥ 1600 px wide")),
]);
groups.push([
  "Act II — student work & stories",
  stories
    .filter((s: { scene?: string }) => s.scene !== "sequence")
    .map((s: { media: { photo: string }; title: string }) =>
      // An unpublished (TODO) story's photo isn't needed until the story itself is confirmed.
      file(s.media.photo, s.title.replace(/^TODO:\s*/, "(story TBC) "), "16:10 landscape, ≥ 1600 px; people only with consent", !s.title.startsWith("TODO:")),
    ),
]);
groups.push([
  "Act II — research missions",
  missions.map((m: { photo: string; name: string }) => file(m.photo, `${m.name} research`, "16:9, ≥ 1600 px, real SRM labs/projects")),
]);
groups.push([
  "Act III — alumni portraits",
  alumni.map((a: { photo: string; name: string }) =>
    file(a.photo, a.name, "Square, ≥ 800 px, official/press photo with written permission"),
  ),
]);
groups.push([
  "Campuses (Explore + campus pages)",
  campuses.map((c: { photo: string; name: string; kind: string }) =>
    file(c.photo, `${c.name}${c.kind === "sister" ? " (sister university)" : ""}`, "16:10, ≥ 2000 px, recognisable landmark"),
  ),
]);

let missing = 0;
for (const [title, rows] of groups) {
  console.log(`\n${title}`);
  for (const r of rows) {
    if (!r.ok && r.required) missing++;
    const mark = r.ok ? "✓" : r.required ? "✗" : "·";
    console.log(`  ${mark} public/${r.path}${r.note ? `  (${r.note})` : ""}\n      ${r.what} — ${r.spec}`);
  }
}
const total = groups.flatMap(([, r]) => r).filter((r) => r.required).length;
console.log(`\n${total - missing}/${total} required media present. ✗ = needed, · = optional.`);
