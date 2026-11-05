"use client";

import { useEffect, useState } from "react";

/**
 * A sticky row of chips for the chapters of a long page. The chip for the chapter you're reading lights up
 * (IntersectionObserver), and the row scrolls sideways on phones. Plain anchor links, so it works without JavaScript.
 */
export function SectionNav({ label, items }: { label: string; items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="grail-sectionnav sticky top-16 z-30">
      <ul className="grail-strip mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "true" : undefined}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap text-white no-underline transition-colors hover:bg-white/10 aria-[current=true]:bg-[#ecd2f3] aria-[current=true]:text-[#1a1018]"
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
