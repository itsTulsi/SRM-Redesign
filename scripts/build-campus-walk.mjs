// node scripts/build-campus-walk.mjs <overpass.json> [more.json …]
//
// Builds public/walk/ktr-world.json for Walk SRM (app/[locale]/walk): the Kattankulathur campus as building footprints
// (metres around the campus centre) with heights and a kind, roads and footpaths, water, trees, and every place in
// content/walk.json positioned with a "door" (where its person stands). Footprints, roads and names are
// © OpenStreetMap contributors (ODbL). Heights come from OSM building:levels, our hostels.json floor counts, or a
// modest estimate; the page says heights are approximate.
//
// To refresh, run this Overpass query (overpass-turbo.eu or any mirror) and pass the JSON in (several files are merged):
//   [out:json][timeout:90];(way["building"](12.8155,80.0360,12.8275,80.0510);way["highway"](12.8155,80.0360,12.8275,80.0510);
//   way["natural"="water"](12.8155,80.0360,12.8275,80.0510);way["leisure"~"park|pitch|garden"](12.8155,80.0360,12.8275,80.0510);
//   node["name"](12.8155,80.0360,12.8275,80.0510););out geom tags center;
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const inputs = process.argv.slice(2);
if (!inputs.length) throw new Error("usage: node scripts/build-campus-walk.mjs <overpass.json> [more.json …]");
// The same OSM object in several files: keep any geometry, and take the tags from the file given last (the newest).
const byId = new Map();
for (const f of inputs)
  for (const e of JSON.parse(readFileSync(f, "utf8")).elements) {
    const k = `${e.type}/${e.id}`;
    const old = byId.get(k);
    byId.set(k, old ? { ...old, ...e, geometry: e.geometry ?? old.geometry, tags: { ...old.tags, ...e.tags } } : e);
  }
const elements = [...byId.values()];
const walk = JSON.parse(readFileSync(new URL("../content/walk.json", import.meta.url), "utf8"));
const hostels = JSON.parse(readFileSync(new URL("../content/hostels.json", import.meta.url), "utf8"));

// Campus centre (between the University Building and the hostels) and the area we keep.
const LAT0 = 12.8222;
const LON0 = 80.0437;
const BOX = { south: 12.8168, north: 12.8268, west: 80.0372, east: 80.0505 };
const PAD = 0.0015; // roads are kept a little beyond the box so they don't stop dead at the edge
const MX = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const MZ = 110540;
const r = (n) => Math.round(n * 2) / 2;
const toXZ = (p) => [r((p.lon - LON0) * MX), r(-(p.lat - LAT0) * MZ)];
const inBox = (p, pad = 0) => p.lat >= BOX.south - pad && p.lat <= BOX.north + pad && p.lon >= BOX.west - pad && p.lon <= BOX.east + pad;

// OSM hostel names → hostels.json slugs, for real floor counts ("G+9").
const HOSTEL_FLOORS = {
  "Paari Hostel": "paari", "Kaari Hostel": "kaari", "Oori Hostel": "oori", "Adhyaman Hostel": "adhiyaman", "Nelson Mandela Hostel": "nelson-mandela",
  "Manoranjitham Hostel": "manoranjitham", "Agasthayar Hostel": "agasthiyar", "N Block Mens Hostel": "n-block", "M Block Girls Hostel": "kopperundevi",
  "Kalpana Chawla Hostel": "kalpana-chawla", "Menakshi Hostel Block": "meenakshi", "Sannasi C Block, Hostel": "sannasi-c",
};
const floorsBySlug = Object.fromEntries(["men", "women", "international"].flatMap((g) => hostels[g].map((b) => [b.slug, b.floors])));
const storeys = (f) => {
  const m = /G\+(\d+)/.exec(f ?? "");
  return m ? Number(m[1]) + 1 : null;
};

// Kinds (k): 0 other · 1 academic · 2 hostel · 3 food · 4 tech · 5 health · 6 faith · 7 workshop · 8 admin/events · 9 homes
const KIND = { other: 0, academic: 1, hostel: 2, food: 3, tech: 4, health: 5, faith: 6, workshop: 7, admin: 8, library: 8, events: 8, arrival: 0, park: 0, homes: 9 };
const kindOf = (t) => {
  const n = (t.name ?? "").toLowerCase();
  if (t.tourism === "hostel" || n.includes("hostel")) return KIND.hostel;
  if (t.amenity === "hospital" || t.building === "hospital" || n.includes("hospital")) return KIND.health;
  if (t.amenity === "place_of_worship" || /temple|church|mosque/.test(n)) return KIND.faith;
  if (/food court|canteen|restaurant|cafe|vendhar|tea stall/.test(n) || ["food_court", "restaurant", "cafe", "fast_food"].includes(t.amenity)) return KIND.food;
  if (/tech park|incubation|bel lab/.test(n)) return KIND.tech;
  if (t.building === "industrial" || /hang[ae]r/.test(n)) return KIND.workshop;
  if (t.building === "apartments" || t.building === "residential" || t.building === "house") return KIND.homes;
  if (/block|college|university|auditorium|library/.test(n) || ["university", "college", "school"].includes(t.building)) return KIND.academic;
  return KIND.other;
};

let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const closeRing = (pts) => {
  if (pts.length > 2 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  return pts;
};
/** Split a polyline into runs that stay inside the padded box. */
const clipLine = (geom) => {
  const runs = [];
  let cur = [];
  for (const p of geom) {
    if (inBox(p, PAD)) cur.push(toXZ(p));
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((run) => run.length > 1);
};

const buildings = [];
const buildingByOsmId = new Map(); // OSM way id → index, for places OSM doesn't name (content/walk.json "osmId")
const osmNames = []; // [name, x, z, tags] for every named building or node, to find places by name
const roads = [];
const water = [];
const green = [];
for (const e of elements) {
  const t = e.tags ?? {};
  if (e.type === "node" || (!e.geometry && e.center)) {
    const p = e.type === "node" ? e : e.center;
    if (t.name && p && inBox(p, PAD)) osmNames.push({ name: t.name, x: toXZ(p)[0], z: toXZ(p)[1], tags: t, ll: [p.lat, p.lon] });
    continue;
  }
  if (!e.geometry || !e.geometry.some((p) => inBox(p))) continue;
  if (t.building) {
    const pts = closeRing(e.geometry.map(toXZ));
    if (pts.length < 3) continue;
    const levels = Number(t["building:levels"]) || null;
    const slug = HOSTEL_FLOORS[t.name];
    const name = (t.name ?? "").toLowerCase();
    let h;
    if (slug && storeys(floorsBySlug[slug])) h = storeys(floorsBySlug[slug]) * 3.3;
    else if (levels) h = levels * 3.4;
    else if (/tech park|university building/.test(name)) h = 45;
    else if (name.includes("hostel")) h = 20;
    else if (/hang[ae]r/.test(name) || t.building === "industrial") h = 9;
    else if (/block|building|lab|hall|centre|center|hospital|auditorium/.test(name)) h = 17;
    else h = 6 + Math.round(rand() * 6);
    const b = { p: pts, h: Math.round(h), k: kindOf(t) };
    buildings.push(b);
    buildingByOsmId.set(e.id, buildings.length - 1);
    if (t.name) {
      const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
      osmNames.push({ name: t.name, x: c[0], z: c[1], tags: t, building: buildings.length - 1 });
    }
  } else if (t.highway) {
    const foot = ["footway", "path", "steps", "pedestrian", "cycleway", "corridor"].includes(t.highway);
    const w = foot ? 2.5 : ({ trunk: 16, trunk_link: 8, primary: 12, secondary: 10, tertiary: 8, residential: 6, unclassified: 6, living_street: 5, service: 4.5, road: 6 }[t.highway] ?? 4);
    for (const run of clipLine(e.geometry)) roads.push(foot ? { p: run, w, f: 1 } : { p: run, w });
  } else if (t.natural === "water") {
    const pts = closeRing(e.geometry.map(toXZ));
    if (pts.length > 2) water.push({ p: pts });
  } else if (t.leisure || t.landuse) {
    const pts = closeRing(e.geometry.map(toXZ));
    if (pts.length > 2) green.push({ p: pts });
  }
}

// ── Geometry helpers ──
const inside = (x, z, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const closestOnSeg = (x, z, a, b) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return [a[0] + t * dx, a[1] + t * dz];
};
const closestOnRing = (x, z, poly) => {
  let best = null;
  let bd = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const q = closestOnSeg(x, z, poly[i], poly[(i + 1) % poly.length]);
    const d = Math.hypot(q[0] - x, q[1] - z);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
};
const nearestRoadPoint = (x, z) => {
  let best = [x, z];
  let bd = Infinity;
  for (const { p } of roads)
    for (let i = 0; i < p.length - 1; i++) {
      const q = closestOnSeg(x, z, p[i], p[i + 1]);
      const d = Math.hypot(q[0] - x, q[1] - z);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  return best;
};
/** A spot just outside the footprint, on the side facing `toward`. */
const doorOf = (poly, toward) => {
  const q = closestOnRing(toward[0], toward[1], poly);
  const c = poly.reduce((s, v) => [s[0] + v[0] / poly.length, s[1] + v[1] / poly.length], [0, 0]);
  let nx = q[0] - c[0];
  let nz = q[1] - c[1];
  const len = Math.hypot(nx, nz) || 1;
  nx /= len;
  nz /= len;
  for (let push = 2.5; push < 30; push += 1.5) {
    const d = [q[0] + nx * push, q[1] + nz * push];
    if (!buildings.some((b) => inside(d[0], d[1], b.p))) return d.map(r);
  }
  return q.map(r);
};

// ── Places ──
const places = {};
const missing = [];
for (const pl of walk.places) {
  // A building OSM maps but doesn't name (the CRC Block): matched by its OSM way id.
  if (pl.osmId !== undefined) {
    const bi = buildingByOsmId.get(pl.osmId);
    if (bi === undefined) {
      missing.push(pl.id);
      continue;
    }
    const bb = buildings[bi];
    if (pl.floors) bb.h = Math.round(pl.floors * 3.4);
    bb.k = KIND[pl.kind] ?? bb.k;
    bb.n = pl.id;
    const c = bb.p.reduce((s, q) => [s[0] + q[0] / bb.p.length, s[1] + q[1] / bb.p.length], [0, 0]);
    places[pl.id] = { x: r(c[0]), z: r(c[1]), door: doorOf(bb.p, nearestRoadPoint(c[0], c[1])), b: bi };
    continue;
  }
  let cands = osmNames.filter((n) => n.name === pl.osm);
  if (pl.osmType) cands = cands.filter((n) => n.tags[pl.osmType]);
  if (pl.osmNear) {
    const [la, lo] = pl.osmNear;
    cands.sort((a, b) => Math.hypot((a.ll?.[0] ?? 0) - la, (a.ll?.[1] ?? 0) - lo) - Math.hypot((b.ll?.[0] ?? 0) - la, (b.ll?.[1] ?? 0) - lo));
  } else cands.sort((a, b) => (b.building !== undefined) - (a.building !== undefined));
  const n = cands[0];
  if (!n) {
    missing.push(pl.id);
    continue;
  }
  let bi = n.building;
  if (bi === undefined) bi = buildings.findIndex((b) => inside(n.x, n.z, b.p));
  let door;
  if (bi >= 0) {
    // A named point inside a building (the library in the University Building): its door faces that point;
    // otherwise the door faces the nearest road.
    door = n.building === undefined ? doorOf(buildings[bi].p, [n.x, n.z]) : doorOf(buildings[bi].p, nearestRoadPoint(n.x, n.z));
    // First place wins (the University Building, not the library inside it).
    if (pl.kind !== "arrival" && pl.kind !== "park" && !buildings[bi].n) buildings[bi].n = pl.id;
  } else door = [r(n.x), r(n.z)];
  places[pl.id] = { x: r(n.x), z: r(n.z), door, ...(bi >= 0 ? { b: bi } : {}) };
}

// A clock tower beside a building's entrance (content/walk.json "clockTower"): a 7 m square standing out from the
// entrance wall, near one end of it, 13 m taller than the building. Its own footprint, so you can't walk through it.
for (const pl of walk.places.filter((x) => x.clockTower)) {
  const P = places[pl.id];
  if (!P) continue;
  const bb = buildings[P.b];
  let best = 0;
  let bd = Infinity;
  bb.p.forEach((a, i) => {
    const c = bb.p[(i + 1) % bb.p.length];
    const d = Math.hypot((a[0] + c[0]) / 2 - P.door[0], (a[1] + c[1]) / 2 - P.door[1]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  const a = bb.p[best];
  const c = bb.p[(best + 1) % bb.p.length];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const ux = (c[0] - a[0]) / len;
  const uz = (c[1] - a[1]) / len;
  let nx = uz;
  let nz = -ux;
  if (inside((a[0] + c[0]) / 2 + nx, (a[1] + c[1]) / 2 + nz, bb.p)) {
    nx = -nx;
    nz = -nz;
  }
  const t = Math.min(len * 0.22, len / 2 - 6);
  const s = 3.5;
  const cx = a[0] + ux * t + nx * (s + 0.2);
  const cz = a[1] + uz * t + nz * (s + 0.2);
  const sq = [
    [cx - ux * s - nx * s, cz - uz * s - nz * s],
    [cx + ux * s - nx * s, cz + uz * s - nz * s],
    [cx + ux * s + nx * s, cz + uz * s + nz * s],
    [cx - ux * s + nx * s, cz - uz * s + nz * s],
  ].map(([x, z]) => [r(x), r(z)]);
  buildings.push({ p: sq, h: bb.h + 13, k: 8, n: `${pl.id}-tower` });
}

// Two places on one building (library, University Building) must not share a door: nudge the second along the wall.
const doors = Object.entries(places);
for (let i = 0; i < doors.length; i++)
  for (let j = 0; j < i; j++) {
    const a = doors[i][1].door;
    const b = doors[j][1].door;
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 6) doors[i][1].door = [a[0] + 8, a[1]];
  }

// ── Trees: on open ground, not in buildings, water or roads ──
const nearRoad = (x, z) =>
  roads.some(({ p, w }) => p.some((a, i) => i < p.length - 1 && Math.hypot(...[x, z].map((v, k) => v - closestOnSeg(x, z, a, p[i + 1])[k])) < w / 2 + 3));
const bounds = { minX: r((BOX.west - LON0) * MX), maxX: r((BOX.east - LON0) * MX), minZ: r(-(BOX.north - LAT0) * MZ), maxZ: r(-(BOX.south - LAT0) * MZ) };
const trees = [];
for (let tries = 0; trees.length < 1100 && tries < 40000; tries++) {
  const x = bounds.minX + rand() * (bounds.maxX - bounds.minX);
  const z = bounds.minZ + rand() * (bounds.maxZ - bounds.minZ);
  if (buildings.some((b) => inside(x, z, b.p)) || water.some((w) => inside(x, z, w.p)) || nearRoad(x, z)) continue;
  if (Object.values(places).some((p) => Math.hypot(p.door[0] - x, p.door[1] - z) < 7)) continue;
  trees.push([r(x), r(z), Math.round((0.7 + rand() * 0.8) * 10) / 10]);
}

// Bus stops (one shelter per stop; pairs a few metres apart are one stop).
const stops = [];
for (const n of osmNames.filter((x) => x.tags.highway === "bus_stop" && x.building === undefined)) {
  const xz = [r(n.x), r(n.z)];
  if (xz[0] < bounds.minX || xz[0] > bounds.maxX || xz[1] < bounds.minZ || xz[1] > bounds.maxZ) continue;
  if (stops.some(([sx, sz]) => Math.hypot(sx - xz[0], sz - xz[1]) < 12)) continue;
  // Stand the shelter beside the road, not on it.
  const q = nearestRoadPoint(xz[0], xz[1]);
  const dx = xz[0] - q[0];
  const dz = xz[1] - q[1];
  const d = Math.hypot(dx, dz) || 1;
  stops.push(d < 6 ? [r(q[0] + (dx / d) * 6), r(q[1] + (dz / d) * 6)] : xz);
}

const out = { origin: [LAT0, LON0], bounds, spawn: walk.spawn, buildings, roads, water, green, trees, stops, places };
mkdirSync(new URL("../public/walk/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/walk/ktr-world.json", import.meta.url), JSON.stringify(out));
console.log(
  `${buildings.length} buildings, ${stops.length} bus stops, ${roads.length} roads (${roads.filter((x) => x.f).length} footpaths), ${water.length} water, ${green.length} green, ${trees.length} trees, ${Object.keys(places).length}/${walk.places.length} places` +
    (missing.length ? `\nnot found in OSM: ${missing.join(", ")}` : ""),
);
