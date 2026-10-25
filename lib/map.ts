import projection from "@/content/map/projection.json";
import { getContent, isTodo, type Campus } from "./content";

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

/**
 * Campuses closer together than a tap target is wide even when zoomed into their region (Ramapuram and
 * Vadapalani are 3.5 km apart). They share one marker at their true midpoint until one is chosen; pins are
 * never displaced from their real coordinates.
 */
const NEAR_GROUPS = [{ id: "chennai-city", members: ["ramapuram", "vadapalani"], parent: "chennai" }] as const;
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
export type MapGroup = { id: "chennai-city"; members: Campus["slug"][]; parent: MapCluster["id"]; x: number; y: number };

export function getMapData(locale = "en"): { campuses: MapCampus[]; clusters: MapCluster[]; groups: MapGroup[] } {
  const { campuses, campusClusters } = getContent(locale);
  const list: MapCampus[] = campuses.map((c) => ({
    slug: c.slug,
    name: c.name,
    city: c.city,
    state: c.state,
    kind: c.kind,
    isMain: c.isMain,
    ...project(c.lat, c.lng),
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
  const groups = NEAR_GROUPS.map((g) => {
    const members = list.filter((c) => (g.members as readonly string[]).includes(c.slug));
    return {
      id: g.id,
      members: members.map((m) => m.slug),
      parent: g.parent,
      x: members.reduce((s, m) => s + m.x, 0) / members.length,
      y: members.reduce((s, m) => s + m.y, 0) / members.length,
    };
  });
  return { campuses: list, clusters, groups };
}
