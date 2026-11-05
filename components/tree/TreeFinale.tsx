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

  // One drawing and one list for every screen size (rendering them twice doubled the homepage's HTML). Phones: the
  // drawing as decoration, then the links as a two-column list. Desktop: the same links placed on the canopy.
  return (
    <div data-tree-finale className="site-container pb-24 lg:pb-40">
      <h3 className="font-display text-section font-bold">{t("finaleTitle")}</h3>
      <p className="mt-3 max-w-prose text-fg-muted">{t("finaleIntro")}</p>

      <div className="relative mx-auto mt-8 lg:mt-10 lg:h-[680px] lg:w-[calc(680px*var(--ar))]" style={{ "--ar": vw / vh } as React.CSSProperties}>
        <div className="relative mx-auto w-full max-w-md lg:absolute lg:inset-0 lg:max-w-none" style={{ aspectRatio: `${vw} / ${vh}` }}>
          <svg viewBox={canopy.viewBox} aria-hidden="true" focusable="false" className="absolute inset-0 size-full overflow-visible">
            {[...canopy.trunk, ...canopy.branches].map((seg, i) => (
              <path key={i} d={seg.d} pathLength={1} strokeWidth={seg.width} className="finale-branch fill-none stroke-tree" strokeLinecap="round" />
            ))}
            {canopy.stems.map((d, i) => (
              <path key={`s${i}`} d={d} pathLength={1} strokeWidth={0.8} className="finale-branch fill-none stroke-tree opacity-60" strokeLinecap="round" />
            ))}
            {/* Phones only: the leaves as decoration (on desktop the links themselves are the leaves). */}
            {canopy.slots.map((p, i) => (
              <ellipse key={`l${i}`} rx={4.5} ry={2.6} className="finale-dot fill-tree lg:hidden" transform={`translate(${minX + p.x * vw} ${minY + p.y * vh}) rotate(${(i * 47) % 180})`} />
            ))}
          </svg>
        </div>

        <ul aria-label={t("finaleList")} className="mt-8 grid grid-cols-2 gap-x-4 gap-y-1 lg:absolute lg:inset-0 lg:mt-0 lg:block">
          {placed.map((leaf) => (
            // The hovered or focused leaf comes to the front, so its card isn't hidden under later leaves.
            <li
              key={leaf.key}
              className="lg:absolute lg:top-[calc(var(--y)*100%)] lg:left-[calc(var(--x)*100%)] lg:hover:z-20 lg:focus-within:z-20"
              style={{ "--x": leaf.x, "--y": leaf.y } as React.CSSProperties}
            >
              <Link
                href={leaf.href}
                className="finale-leaf group relative flex min-h-12 items-center gap-3 py-1 text-fg no-underline lg:size-11 lg:min-h-0 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:justify-center lg:rounded-full lg:py-0"
              >
                <span aria-hidden="true" className="hidden size-5 rotate-45 rounded-[0_100%_0_100%] bg-tree transition-transform group-hover:scale-125 group-focus-visible:scale-125 lg:block" />
                {/* Phones: the row itself. Desktop: the link's card, there for screen readers and shown on hover and focus. */}
                <span
                  className={`finale-card flex min-w-0 items-center gap-3 lg:pointer-events-none lg:absolute lg:top-1/2 lg:z-10 lg:w-64 lg:-translate-y-1/2 lg:rounded-2xl lg:border lg:border-line lg:bg-bg lg:p-3 lg:text-left lg:opacity-0 lg:shadow-2xl lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100 ${
                    leaf.x > 0.55 ? "lg:right-full lg:mr-2" : "lg:left-full lg:ml-2"
                  }`}
                >
                  <Photo src={leaf.image} alt="" decorative sizes="(min-width: 1024px) 56px, 40px" className="size-10 shrink-0 rounded-lg bg-paper lg:size-14 lg:rounded-xl" />
                  <span className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 text-sm leading-snug font-semibold lg:line-clamp-none lg:text-base">{leaf.name}</span>
                    <span className="mt-0.5 hidden text-sm text-fg-muted lg:line-clamp-2">{leaf.line}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* The visitor's leaf: Apply. Gold, because it is the action. Top of the crown on desktop, full width on phones. */}
        <Link
          href="/admissions#apply"
          className="finale-apex mt-8 flex min-h-12 w-full flex-col items-center justify-center rounded-2xl bg-action px-5 py-3 text-center text-on-action no-underline lg:absolute lg:top-[calc(var(--ay)*100%)] lg:left-[calc(var(--ax)*100%)] lg:mt-0 lg:w-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-row lg:gap-3 lg:rounded-full lg:py-2 lg:pr-5 lg:pl-3 lg:whitespace-nowrap"
          style={{ "--ax": canopy.apex.x, "--ay": canopy.apex.y } as React.CSSProperties}
        >
          <span aria-hidden="true" className="hidden size-5 rotate-45 rounded-[0_100%_0_100%] border-2 border-ink lg:block" />
          <span className="text-sm lg:text-base lg:font-semibold">{t("yourLeaf")}</span>
          <span aria-hidden="true" className="hidden lg:inline">·</span>
          <span className="text-lg font-bold lg:text-base lg:font-semibold">{t("apply")}</span>
        </Link>
      </div>
    </div>
  );
}
