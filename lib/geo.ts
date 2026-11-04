import projection from "@/content/map/projection.json";

/**
 * Map maths that is safe to ship to the browser: no content JSON, just the projection (a few numbers).
 * lib/map.ts builds the map data on the server and re-exports these.
 */

/** Position as fractions (0..1) of the map art in public/map/india.svg, matching scripts/build-map.mts. */
export function project(lat: number, lng: number) {
  const { width, height, minLng, maxLat, k, scale } = projection;
  return { x: ((lng - minLng) * k * scale) / width, y: ((maxLat - lat) * scale) / height };
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle ("as the crow flies") distance in km. Not road distance: we have no road or travel-time data. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** To the nearest 5 km, or the nearest 1 km under 50 km: precise enough, without pretending to be exact. */
export const roundKm = (km: number) => (km < 50 ? Math.max(1, Math.round(km)) : Math.round(km / 5) * 5);

/** Adds a starting point to a Google Maps directions link. */
export const withOrigin = (directions: string, origin: { lat: number; lng: number } | null) =>
  origin ? `${directions}&origin=${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}` : directions;
