import { campuses, isTodo } from "@/lib/content";
import { nirfLine, OG_CONTENT_TYPE, OG_SIZE, ogContent, ogImage } from "@/lib/og";

export const alt = "SRMIST campus: name, location and distance from Chennai";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return campuses.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { getCampus, site } = ogContent();
  const c = getCampus(slug);
  if (!c) return ogImage({ title: site.name });
  const distance = typeof c.distanceFromChennai === "string" && !isTodo(c.distanceFromChennai) ? c.distanceFromChennai : null;
  return ogImage({
    eyebrow: `${c.city}, ${c.state}`,
    title: c.kind === "sister" ? c.name : `${c.name} campus`,
    fact: distance,
    badges: [c.kind === "sister" ? "Sister university" : nirfLine("university")],
    photo: c.photo,
  });
}
