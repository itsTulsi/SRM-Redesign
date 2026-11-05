"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/**
 * The live time at Kattankulathur, set huge and faint behind the phone (the reference's countdown digits, but true:
 * SRM publishes no upcoming deadline we could count down to). Decorative, so hidden from screen readers. Rendered
 * only in the browser, since a time baked into the static page would be wrong.
 */
export function ChennaiClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p aria-hidden="true" className={className}>
      {(now ?? "00:00:00").split("").map((ch, i) => (
        <span key={i} className={ch === ":" ? "grail-clock-colon" : "grail-clock-digit"}>
          {ch}
        </span>
      ))}
    </p>
  );
}
