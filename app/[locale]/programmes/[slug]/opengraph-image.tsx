import { isTodo, programmes, type CollegeSlug } from "@/lib/content";
import { nirfLine, OG_CONTENT_TYPE, OG_SIZE, ogContent, ogImage } from "@/lib/og";

export const alt = "SRMIST programme: name, college, duration and annual fee";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return programmes.map((p) => ({ slug: p.slug }));
}

// Colleges with a matching NIRF category; the rest show the university rank.
const NIRF_CATEGORY: Partial<Record<CollegeSlug, string>> = {
  engineering: "engineering",
  medicine: "medical",
  dental: "dental",
  law: "law",
  management: "management",
  architecture: "architecture",
  pharmacy: "pharmacy",
  agriculture: "agriculture",
};

const inr = new Intl.NumberFormat("en-IN");

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { getProgramme, getCollege, getCampus, site } = ogContent();
  const p = getProgramme(slug);
  if (!p) return ogImage({ title: site.name });
  const years = !isTodo(p.durationYears) && typeof p.durationYears === "number" ? `${p.durationYears} years` : null;
  const fee = !isTodo(p.feesPerYearINR) && typeof p.feesPerYearINR === "number" ? `₹${inr.format(p.feesPerYearINR)} a year` : null;
  return ogImage({
    eyebrow: [getCollege(p.college)?.shortName, p.campuses.map((c) => getCampus(c)?.name ?? c).join(", "), years].filter(Boolean).join(" · "),
    title: p.officialName ?? p.name,
    fact: fee,
    badges: [nirfLine(NIRF_CATEGORY[p.college] ?? "university") ?? nirfLine("university")],
  });
}
