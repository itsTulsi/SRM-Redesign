import { kolam, type KolamVariant } from "@/lib/kolam";

/** A kolam crest: ink loops and paper dots on a colour ground. Decorative: the words beside it carry the meaning. */
export function Kolam({ variant, color, className = "" }: { variant: KolamVariant; color: string; className?: string }) {
  const k = kolam(variant);
  return (
    <svg viewBox={`0 0 ${k.size} ${k.size}`} aria-hidden="true" focusable="false" className={className}>
      <rect width={k.size} height={k.size} rx={k.size * 0.18} fill={color} />
      <g fill="none" stroke="#141310" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {k.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#F4EFE6">
        {k.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={2.2} />
        ))}
      </g>
    </svg>
  );
}
