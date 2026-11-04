import { getLocale, getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { getContent, isTodo } from "@/lib/content";
import { Link } from "@/lib/i18n";
import { SECTION } from "@/lib/sections";
import { generateCanopy } from "@/lib/tree";

type Leaf = { key: string; name: string; line: string; href: string; image: string };

/**
 * End of Act III: the Living Tree fully grown. Every leaf is a real person or project that started at SRM (alumni,
 * student work, startups from content JSON), and one empty leaf is the visitor's: Apply.
 * Desktop: real links placed over the drawing, each with a card on hover or focus. Phones: the drawing as
 * decoration, then the same links as a list. Motion (lib/motion-scenes) only animates what's already here.
 */
export async function TreeFinale() {
  const t = await getTranslations("Acts.lead");
  const locale = await getLocale();
  const { alumni, startups, studentWork } = getContent(locale);

  const leaves: Leaf[] = [
    ...alumni.map((a) => ({ key: a.slug, name: a.name, line: a.role, href: `#${a.slug}`, image: a.photo })),
    ...studentWork
      .filter((s) => !isTodo(s.title))
      .map((s) => ({ key: s.slug, name: s.title, line: s.dek, href: `/stories/${s.slug}`, image: s.media.photo ?? "" })),
    ...startups.map((s) => ({ key: s.slug, name: s.name, line: t("startupLine"), href: `#${SECTION.startups}`, image: s.logo })),
  ];
  const canopy = generateCanopy(leaves.length);
  const [minX, minY, vw, vh] = canopy.viewBox.split(" ").map(Number) as [number, number, number, number];
  // Reading order for Tab: top to bottom in rows, left to right within a row.
  const placed = leaves
    .map((leaf, i) => ({ ...leaf, ...canopy.slots[i]! }))
    .sort((a, b) => Math.round(a.y * 12) - Math.round(b.y * 12) || a.x - b.x);

  const drawing = (withLeaves: boolean) => (
    <svg viewBox={canopy.viewBox} aria-hidden="true" focusable="false" className="absolute inset-0 size-full overflow-visible">
      {[...canopy.trunk, ...canopy.branches].map((s, i) => (
        <path key={i} d={s.d} pathLength={1} strokeWidth={s.width} className="finale-branch fill-none stroke-tree" strokeLinecap="round" />
      ))}
      {canopy.stems.map((d, i) => (
        <path key={`s${i}`} d={d} pathLength={1} strokeWidth={0.8} className="finale-branch fill-none stroke-tree opacity-60" strokeLinecap="round" />
      ))}
      {withLeaves
        ? canopy.slots.map((p, i) => (
            <ellipse key={`l${i}`} rx={4.5} ry={2.6} className="finale-dot fill-tree" transform={`translate(${minX + p.x * vw} ${minY + p.y * vh}) rotate(${(i * 47) % 180})`} />
          ))
        : null}
    </svg>
  );

  return (
    <div data-tree-finale className="site-container pb-24 lg:pb-40">
      <h3 className="font-display text-section font-bold">{t("finaleTitle")}</h3>
      <p className="mt-3 max-w-prose text-fg-muted">{t("finaleIntro")}</p>

      {/* ── Desktop: links on the canopy ── */}
      <div className="relative mx-auto mt-10 hidden h-[680px] lg:block" style={{ aspectRatio: `${vw} / ${vh}` }}>
        {drawing(false)}
        <ul aria-label={t("finaleList")} className="absolute inset-0">
          {placed.map((leaf) => (
            // The hovered or focused leaf comes to the front, so its card isn't hidden under later leaves.
            <li key={leaf.key} className="absolute hover:z-20 focus-within:z-20" style={{ left: `${leaf.x * 100}%`, top: `${leaf.y * 100}%` }}>
              <Link
                href={leaf.href}
                className="finale-leaf group relative flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-fg no-underline"
              >
                <span aria-hidden="true" className="block size-5 rotate-45 rounded-[0_100%_0_100%] bg-tree transition-transform group-hover:scale-125 group-focus-visible:scale-125" />
                {/* The card is the link's text: always there for screen readers, shown on hover and focus. */}
                <span
                  className={`finale-card pointer-events-none absolute top-1/2 z-10 flex w-64 -translate-y-1/2 items-center gap-3 rounded-2xl border border-line bg-bg p-3 text-left opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    leaf.x > 0.55 ? "right-full mr-2" : "left-full ml-2"
                  }`}
                >
                  <Photo src={leaf.image} alt="" decorative sizes="56px" className="size-14 shrink-0 rounded-xl bg-paper" />
                  <span className="flex min-w-0 flex-col">
                    <span className="leading-snug font-semibold">{leaf.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{leaf.line}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/admissions#apply"
          className="finale-apex absolute flex min-h-12 -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-action py-2 pr-5 pl-3 font-semibold whitespace-nowrap text-on-action no-underline"
          style={{ left: `${canopy.apex.x * 100}%`, top: `${canopy.apex.y * 100}%` }}
        >
          <span aria-hidden="true" className="block size-5 rotate-45 rounded-[0_100%_0_100%] border-2 border-ink" />
          {t("yourLeaf")} · {t("apply")}
        </Link>
      </div>

      {/* ── Phones and tablets: the drawing as decoration, the same links as a list ── */}
      <div className="lg:hidden">
        <div className="relative mx-auto mt-8 w-full max-w-md" style={{ aspectRatio: `${vw} / ${vh}` }}>
          {drawing(true)}
        </div>
        <ul aria-label={t("finaleList")} className="mt-8 grid grid-cols-2 gap-x-4 gap-y-1">
          {leaves.map((leaf) => (
            <li key={leaf.key}>
              <Link href={leaf.href} className="flex min-h-12 items-center gap-3 py-1 text-fg no-underline">
                <Photo src={leaf.image} alt="" decorative sizes="40px" className="size-10 shrink-0 rounded-lg bg-paper" />
                <span className="line-clamp-2 text-sm leading-snug font-semibold">{leaf.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/admissions#apply"
          className="mt-8 flex min-h-12 w-full flex-col items-center justify-center rounded-2xl bg-action px-5 py-3 text-center text-on-action no-underline"
        >
          <span className="text-sm">{t("yourLeaf")}</span>
          <span className="text-lg font-bold">{t("apply")}</span>
        </Link>
      </div>
    </div>
  );
}
