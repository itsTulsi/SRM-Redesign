import type { Stat } from "@/lib/content";

/**
 * A number as real SSR text (§5: never render 0 without JS). data-count* lets step 7 animate
 * a count-up from this final value as an enhancement only.
 */
export function StatFigure({ stat, size = "lg" }: { stat: Stat; size?: "lg" | "md" }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="order-2 text-fg-muted">{stat.label}</dt>
      <dd
        className={`order-1 font-display leading-none font-bold tracking-tight whitespace-nowrap tabular-nums ${
          size === "lg" ? "text-[clamp(2.25rem,7vw,5.5rem)]" : "text-[clamp(1.875rem,4vw,3rem)]"
        }`}
        data-count={stat.value}
        data-count-prefix={stat.prefix ?? ""}
        data-count-suffix={stat.suffix ?? ""}
        data-count-decimals={stat.decimals ?? 0}
      >
        {stat.display}
      </dd>
    </div>
  );
}
