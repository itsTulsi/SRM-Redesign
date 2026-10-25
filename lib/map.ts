import projection from "@/content/map/projection.json";
import { campusClusters, campuses, isTodo, type Campus } from "./content";

/**
 * Campus map data for the client (server-side; keeps content JSON out of the bundle).
 * Positions are fractions (0..1) of the map art in public/map/india.svg, from the same projection
 * scripts/build-map.mts used to draw it.
 */
export function project(lat: number, lng: number) {
  const { width, height, minLng, maxLat, k, scale } = projection;
  return { x: ((lng - minLng) * k * scale) / width, y: ((maxLat - lat) * scale) / height };
}

export const mapAspect = projection.width / projection.height;

export const directionsUrl = (c: Campus) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.directionsQuery)}`;

/** Pre-rendered street map image (scripts/build-street-maps.mts) + link to the interactive OpenStreetMap. */
export function streetMap(c: Campus) {
  return {
    image: `/map/street/${c.slug}.jpg`,
    link: `https://www.openstreetmap.org/?${c.coordsApprox ? "" : `mlat=${c.lat}&mlon=${c.lng}`}#map=${c.coordsApprox ? 13 : 16}/${c.lat}/${c.lng}`,
  };
}

// Display-only nudges (px) where two campuses sit closer than a pin is wide, even fully zoomed.
const NUDGE: Partial<Record<Campus["slug"], [number, number]>> = { ramapuram: [-30, 8], vadapalani: [6, -26] };
// Which side a pin's label sits on in the overview, so labels don't collide.
const LABEL_LEFT = new Set(["tiruchirappalli", "srm-sikkim", "ramapuram"]);

export type MapCampus = {
  slug: Campus["slug"];
  name: string;
  city: string;
  state: string;
  kind: Campus["kind"];
  isMain: boolean;
  x: number;
  y: number;
  nudge: [number, number];
  labelLeft: boolean;
  cluster: Campus["cluster"] | null;
  address: string | null;
  coordsApprox: boolean;
  website: string;
  directions: string;
  street: { image: string; link: string };
  tour: string | null;
};
export type MapCluster = { id: "chennai" | "delhi"; members: Campus["slug"][]; zoom: number; x: number; y: number };

export function getMapData(): { campuses: MapCampus[]; clusters: MapCluster[] } {
  const list: MapCampus[] = campuses.map((c) => ({
    slug: c.slug,
    name: c.name,
    city: c.city,
    state: c.state,
    kind: c.kind,
    isMain: c.isMain,
    ...project(c.lat, c.lng),
    nudge: NUDGE[c.slug] ?? [0, 0],
    labelLeft: LABEL_LEFT.has(c.slug),
    cluster: c.cluster ?? null,
    address: isTodo(c.address) ? null : c.address,
    coordsApprox: !!c.coordsApprox,
    website: c.website,
    directions: directionsUrl(c),
    street: streetMap(c),
    tour: c.tour360Url,
  }));
  const clusters = campusClusters.map((cl) => {
    const members = list.filter((c) => cl.members.includes(c.slug));
    const x = members.reduce((s, m) => s + m.x, 0) / members.length;
    const y = members.reduce((s, m) => s + m.y, 0) / members.length;
    return { id: cl.id, members: cl.members, zoom: cl.zoom, x, y };
  });
  return { campuses: list, clusters };
}
