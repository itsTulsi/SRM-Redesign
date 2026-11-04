import { isTodo, stories } from "@/lib/content";
import { OG_CONTENT_TYPE, OG_SIZE, ogContent, ogImage } from "@/lib/og";

export const alt = "SRMIST story: headline, summary and photo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return stories.filter((s) => !isTodo(s.title)).map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { getStory, site } = ogContent();
  const s = getStory(slug);
  if (!s || isTodo(s.title)) return ogImage({ title: site.name });
  return ogImage({ eyebrow: s.kind === "student-work" ? "Student work" : "News", title: s.title, sub: s.dek, photo: s.media.photo });
}
