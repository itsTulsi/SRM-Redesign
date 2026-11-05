// node scripts/build-campus-3d.mjs <overpass.json>
//
// Turns an OpenStreetMap extract of the Kattankulathur campus into public/map/ktr-campus.json: building footprints
// (in metres around the campus centre), heights, roads, water and tree spots, for the 3D hostel finder on /hostels.
// Footprints and names are © OpenStreetMap contributors (ODbL). Heights come from OSM's building:levels, our own
// hostels.json floor counts ("G+9") or, failing both, a modest guess; the page says heights are approximate.
//
// To refresh: run this Overpass query (overpass-turbo.eu or any mirror) and pass the JSON file in.
//   [out:json];(way["building"](12.8150,80.0330,12.8300,80.0520);way["highway"](12.8150,80.0330,12.8300,80.0520);
//   way["natural"="water"](12.8150,80.0330,12.8300,80.0520););out geom tags;
import { readFileSync, writeFileSync } from "node:fs";

const [input] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-campus-3d.mjs <overpass.json>");
const osm = JSON.parse(readFileSync(input, "utf8"));
const hostels = JSON.parse(readFileSync(new URL("../content/hostels.json", import.meta.url), "utf8"));

// The campus heart (between the hostels and the Tech Park) and the area we draw around it.
const LAT0 = 12.8215;
const LON0 = 80.0435;
const BOX = { south: 12.8165, north: 12.8265, west: 80.037, east: 80.05 };
const MX = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const MZ = 110540;
const r = (n) => Math.round(n * 2) / 2;
const toXZ = (p) => [r((p.lon - LON0) * MX), r(-(p.lat - LAT0) * MZ)];
const inBox = (g) => g.some((p) => p.lat >= BOX.south && p.lat <= BOX.north && p.lon >= BOX.west && p.lon <= BOX.east);

// OSM building name → our hostel block (content/hostels.json). Only blocks OSM actually maps are listed.
const HOSTEL_BY_OSM = {
  "Paari Hostel": "paari",
  "Kaari Hostel": "kaari",
  "Oori Hostel": "oori",
  "Adhyaman Hostel": "adhiyaman",
  "Nelson Mandela Hostel": "nelson-mandela",
  "Manoranjitham Hostel": "manoranjitham",
  "Agasthayar Hostel": "agasthiyar",
  "N Block Mens Hostel": "n-block",
  "M Block Girls Hostel": "kopperundevi",
  "Kalpana Chawla Hostel": "kalpana-chawla",
  "Menakshi Hostel Block": "meenakshi",
  "Sannasi C Block, Hostel": "sannasi-c",
};
// Well-known non-hostel buildings that get a small label, for orientation.
const LANDMARKS = new Set(["SRM Tech Park", "Tech Park 2", "SRM University Building", "C V Raman Block", "Architecture Block", "MBA Block", "biotech block", "Main Block", "Vendhar Square", "Canteen"]);

const blocks = Object.fromEntries(["men", "women", "international"].flatMap((g) => hostels[g].map((b) => [b.slug, { ...b, group: g }])));
const storeys = (floors) => {
  const m = /G\+(\d+)/.exec(floors ?? "");
  return m ? Number(m[1]) + 1 : null;
};
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const buildings = [];
const roads = [];
const water = [];
for (const e of osm.elements) {
  const t = e.tags ?? {};
  if (!e.geometry || !inBox(e.geometry)) continue;
  const pts = e.geometry.map(toXZ);
  if (t.building) {
    if (pts.length > 2 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
    if (pts.length < 3) continue;
    const slug = HOSTEL_BY_OSM[t.name];
    const levels = Number(t["building:levels"]) || null;
    const name = t.name?.toLowerCase() ?? "";
    let h;
    if (slug && storeys(blocks[slug]?.floors)) h = storeys(blocks[slug].floors) * 3.3;
    else if (levels) h = levels * 3.4;
    else if (slug || name.includes("hostel")) h = 20;
    else if (/block|building|tech|lab|hall|centre|center/.test(name)) h = 17;
    else h = 6 + Math.round(rand() * 8);
    const b = { p: pts, h: Math.round(h) };
    if (slug) Object.assign(b, { slug, group: blocks[slug].group, name: blocks[slug].name });
    else if (LANDMARKS.has(t.name)) b.label = t.name === "biotech block" ? "Biotech Block" : t.name;
    buildings.push(b);
  } else if (t.highway && !["footway", "path", "steps", "corridor", "cycleway", "pedestrian", "track"].includes(t.highway)) {
    const w = { trunk: 14, primary: 12, secondary: 10, tertiary: 8, residential: 6, unclassified: 6, service: 4.5 }[t.highway] ?? 4;
    roads.push({ p: pts, w });
  } else if (t.natural === "water") {
    if (pts.length > 2 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
    water.push({ p: pts });
  }
}

// Trees: scattered on open ground (not inside a building or pond, not on a road).
const inside = (x, z, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const nearRoad = (x, z) =>
  roads.some(({ p, w }) =>
    p.some((a, i) => {
      const b = p[i + 1];
      if (!b) return false;
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)) < w / 2 + 4;
    }),
  );
const bounds = { minX: r((BOX.west - LON0) * MX), maxX: r((BOX.east - LON0) * MX), minZ: r(-(BOX.north - LAT0) * MZ), maxZ: r(-(BOX.south - LAT0) * MZ) };
const trees = [];
for (let tries = 0; trees.length < 700 && tries < 20000; tries++) {
  const x = bounds.minX + rand() * (bounds.maxX - bounds.minX);
  const z = bounds.minZ + rand() * (bounds.maxZ - bounds.minZ);
  if (buildings.some((b) => inside(x, z, b.p)) || water.some((w) => inside(x, z, w.p)) || nearRoad(x, z)) continue;
  trees.push([r(x), r(z), Math.round((0.7 + rand() * 0.8) * 10) / 10]);
}

const out = { origin: [LAT0, LON0], bounds, buildings, roads, water, trees };
writeFileSync(new URL("../public/map/ktr-campus.json", import.meta.url), JSON.stringify(out));
const mapped = buildings.filter((b) => b.slug).map((b) => b.slug);
console.log(`${buildings.length} buildings (${mapped.length} hostels: ${mapped.join(", ")}), ${roads.length} roads, ${water.length} water, ${trees.length} trees`);
