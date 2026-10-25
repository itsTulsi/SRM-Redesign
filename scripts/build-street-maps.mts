/**
 * Static street maps for each campus: public/map/street/<slug>.jpg (800×600, centred on the campus).
 *
 *   node scripts/build-street-maps.mts <tile-cache-dir>
 *
 * Why static: the OpenStreetMap embed is now a ~1.4 MB WebGL app — too heavy for a ₹8,000 phone and broken
 * without WebGL. A pre-rendered image is instant, needs no JS and works in Lite Mode; "Get directions" opens
 * the interactive map. Tiles © OpenStreetMap contributors (ODbL) — attribution is shown under every map.
 * Polite use of tile.openstreetmap.org: ~9 tiles per campus, cached, sequential, identified User-Agent.
 * Requires ffmpeg (stitch + crop). Re-run only when a campus moves.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const cache = process.argv[2];
if (!cache) throw new Error("usage: build-street-maps.mts <tile-cache-dir>");
mkdirSync(cache, { recursive: true });
const root = join(import.meta.dirname, "..");
const out = join(root, "public/map/street");
mkdirSync(out, { recursive: true });

type Campus = { slug: string; lat: number; lng: number; coordsApprox?: boolean };
const { campuses } = JSON.parse(readFileSync(join(root, "content/campuses.json"), "utf8")) as { campuses: Campus[] };

const W = 800;
const H = 600;
const TILE = 256;
const UA = "SRM-Redesign design-challenge build script (one-off static maps; abhiautar123@gmail.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function worldPx(lat: number, lng: number, z: number) {
  const n = TILE * 2 ** z;
  const φ = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * n };
}

async function tile(z: number, x: number, y: number) {
  const file = join(cache, `${z}-${x}-${y}.png`);
  if (!existsSync(file)) {
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`tile ${z}/${x}/${y}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    await sleep(400);
  }
  return file;
}

for (const c of campuses) {
  const z = c.coordsApprox ? 13 : 16;
  const p = worldPx(c.lat, c.lng, z);
  const left = Math.round(p.x - W / 2);
  const top = Math.round(p.y - H / 2);
  const tx0 = Math.floor(left / TILE);
  const ty0 = Math.floor(top / TILE);
  const tx1 = Math.floor((left + W - 1) / TILE);
  const ty1 = Math.floor((top + H - 1) / TILE);

  const files: string[] = [];
  const layout: string[] = [];
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      files.push(await tile(z, tx, ty));
      layout.push(`${(tx - tx0) * TILE}_${(ty - ty0) * TILE}`);
    }

  const target = join(out, `${c.slug}.jpg`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    `xstack=inputs=${files.length}:layout=${layout.join("|")},crop=${W}:${H}:${left - tx0 * TILE}:${top - ty0 * TILE},format=yuvj420p`,
    "-frames:v", "1", "-q:v", "4", target,
  ]);
  console.log(`✓ ${c.slug} z${z} (${files.length} tiles) → public/map/street/${c.slug}.jpg`);
}
