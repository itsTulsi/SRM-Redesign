"use client";

import type Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Crest } from "@/components/grail/Crest";
import { CompareToggle } from "@/components/programme/CompareToggle";
import { Link } from "@/lib/i18n";
import { parseCompare, readCompareSnapshot, serverCompareSnapshot, subscribeCompare } from "@/lib/compare";
import { recommend } from "@/lib/recommend";
import { programmeTitleName } from "@/lib/view-transition";

export type ExplorerCard = {
  slug: string;
  name: string;
  /** Official English name, so English queries match on Tamil and Hindi pages too. */
  alt: string;
  summary: string;
  college: string;
  level: "UG" | "PG";
  duration: string | null;
  campuses: string;
  fee: string | null;
  tags: string[];
};
type Strings = {
  search: string;
  placeholder: string;
  all: string;
  ug: string;
  pg: string;
  colleges: string;
  showing: string;
  none: string;
  clear: string;
  view: string;
  suggested: string;
  suggestedWhy: string;
  because: string;
};
type Level = "all" | "UG" | "PG";

/**
 * The programme finder: type to search (fuzzy, instant), switch level, tap a college. Everything is rendered on the
 * server first (the full list, grouped, with the anchors the nav links to), so it works and is crawlable without
 * JavaScript; filtering only hides cards. Fuse.js loads on the first keystroke.
 */
export function ProgrammeExplorer({ cards, colleges, strings }: { cards: ExplorerCard[]; colleges: { slug: string; name: string }[]; strings: Strings }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level>("all");
  const [college, setCollege] = useState<string | null>(null);
  const [hits, setHits] = useState<Set<string> | null>(null);
  const fuse = useRef<Fuse<ExplorerCard> | null>(null);

  // "Suggested for you": similar to what you pinned or opened. Both lists live only on this device.
  const pinned = parseCompare(useSyncExternalStore(subscribeCompare, readCompareSnapshot, serverCompareSnapshot));
  const [viewed, setViewed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setViewed(JSON.parse(localStorage.getItem("srm-viewed") ?? "[]"));
    } catch {
      setViewed([]);
    }
  }, []);
  const suggestions = useMemo(() => {
    const seedSlugs = new Set([...pinned, ...viewed]);
    const seeds = cards.filter((c) => seedSlugs.has(c.slug));
    return seeds.length ? recommend(cards, seeds, 3) : [];
  }, [cards, pinned, viewed]);

  // Searching is client-only; the server render shows everything.
  useEffect(() => {
    const q = query.trim();
    if (!q) return setHits(null);
    let live = true;
    (async () => {
      if (!fuse.current) {
        const { default: F } = await import("fuse.js");
        fuse.current = new F(cards, {
          keys: [
            { name: "name", weight: 3 },
            { name: "alt", weight: 2 },
            { name: "tags", weight: 2 },
            { name: "summary", weight: 1 },
          ],
          threshold: 0.38,
          ignoreLocation: true,
        });
      }
      if (live) setHits(new Set(fuse.current.search(q).map((r) => r.item.slug)));
    })();
    return () => {
      live = false;
    };
  }, [query, cards]);

  const shown = useMemo(
    () => cards.filter((c) => (level === "all" || c.level === level) && (!college || c.college === college) && (!hits || hits.has(c.slug))),
    [cards, level, college, hits],
  );
  const visible = new Set(shown.map((c) => c.slug));
  const filtering = level !== "all" || !!college || !!hits;
  const count = (slug: string) => cards.filter((c) => c.college === slug && (level === "all" || c.level === level)).length;
  const clear = () => {
    setQuery("");
    setLevel("all");
    setCollege(null);
  };

  const grid = (list: ExplorerCard[]) => (
    <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((p, i) => (
        <li
          key={p.slug}
          id={p.slug}
          hidden={!visible.has(p.slug)}
          style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
          className="grail-paper grail-paper-link grail-card-in group relative flex flex-col gap-3 p-6 target:ring-4 target:ring-[var(--focus)]"
        >
          <div className="flex items-center justify-between gap-3">
            <Crest seed={p.college} className="size-10 transition-transform duration-500 group-hover:rotate-45" />
            <p className="text-right text-xs font-semibold tracking-wide text-fg-muted uppercase">
              {[p.level === "UG" ? strings.ug : strings.pg, p.duration].filter(Boolean).join(" · ")}
            </p>
          </div>
          <h4 style={programmeTitleName(p.slug)} className="text-xl leading-snug font-semibold">
            <Link href={`/programmes/${p.slug}`} className="text-fg no-underline after:absolute after:inset-0 after:rounded-[24px] after:content-[''] hover:underline">
              {p.name}
            </Link>
          </h4>
          <p className="text-fg-muted">{p.summary}</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[var(--line-subtle)] pt-3">
            <div className="text-sm">
              {p.fee ? <p className="font-semibold">{p.fee}</p> : null}
              <p className="text-fg-muted">{p.campuses}</p>
            </div>
            {/* Above the stretched link, so it stays its own button. */}
            <CompareToggle slug={p.slug} name={p.name} className="relative z-10 text-fg" />
          </div>
        </li>
      ))}
    </ul>
  );

  const section = (lvl: "UG" | "PG", id: string, title: string) => {
    const inLevel = cards.filter((c) => c.level === lvl);
    const any = inLevel.some((c) => visible.has(c.slug));
    return (
      <section id={id} aria-labelledby={`${id}-h`} hidden={!any} className="scroll-mt-40">
        <h3 id={`${id}-h`} className="grail-num text-[clamp(2rem,4.5vw,3.5rem)] uppercase">
          {title}
        </h3>
        <div className="mt-6 flex flex-col gap-12">
          {colleges.map((c) => {
            const list = inLevel.filter((p) => p.college === c.slug);
            if (!list.length) return null;
            const anyHere = list.some((p) => visible.has(p.slug));
            return (
              <section key={c.slug} id={lvl === "UG" ? c.slug : `${c.slug}-pg`} aria-labelledby={`${id}-${c.slug}`} hidden={!anyHere} className="scroll-mt-40">
                <div className="flex items-center gap-3 border-t border-[var(--line-subtle)] pt-5">
                  <Crest seed={c.slug} className="size-11" />
                  <h4 id={`${id}-${c.slug}`} className="text-2xl font-semibold">
                    {c.name}
                  </h4>
                </div>
                {grid(list)}
              </section>
            );
          })}
        </div>
      </section>
    );
  };

  const pill = "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm font-semibold aria-pressed:border-[#000] aria-pressed:bg-[#000] aria-pressed:text-[#fff]";
  return (
    <div>
      {/* The filter bar stays in reach while you scroll the list (large screens). */}
      <div className="grail-filterbar z-20 -mx-4 flex flex-col gap-3 px-4 py-4 sm:-mx-8 sm:px-8 lg:sticky lg:top-16 lg:-mx-12 lg:px-12">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">{strings.search}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={strings.placeholder}
              className="min-h-12 w-full rounded-full border border-[var(--line)] bg-[#ffffff] pr-4 pl-12 text-base text-[#000] placeholder:text-[#666]"
            />
          </label>
          <div role="group" aria-label={strings.search} className="flex gap-2">
            {(["all", "UG", "PG"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={pill}>
                {l === "all" ? strings.all : l === "UG" ? strings.ug : strings.pg}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label={strings.colleges} className="grail-strip -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {colleges.map((c) => {
            const n = count(c.slug);
            if (!n) return null;
            return (
              <button key={c.slug} type="button" aria-pressed={college === c.slug} onClick={() => setCollege(college === c.slug ? null : c.slug)} className={pill}>
                <Crest seed={c.slug} className="size-6" />
                {c.name}
                <span className="rounded-full bg-[var(--line-subtle)] px-2 text-xs text-[#000]">{n}</span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="flex flex-wrap items-center gap-x-4 text-sm text-fg-muted">
          {strings.showing.replace("{n}", String(shown.length)).replace("{total}", String(cards.length))}
          {filtering ? (
            <button type="button" onClick={clear} className="inline-flex min-h-11 items-center font-semibold text-fg underline underline-offset-4">
              {strings.clear}
            </button>
          ) : null}
        </p>
      </div>

      {suggestions.length && !filtering ? (
        <section aria-labelledby="suggested-h" className="mt-8 rounded-[28px] bg-[#000] p-6 text-[#fff]">
          <h3 id="suggested-h" className="grail-num text-3xl uppercase">
            {strings.suggested}
          </h3>
          <p className="mt-1 text-sm text-[#b8b8b8]">{strings.suggestedWhy}</p>
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {suggestions.map(({ item, because }) => (
              <li key={item.slug}>
                <Link href={`/programmes/${item.slug}`} className="flex h-full flex-col gap-1 rounded-2xl border border-white/20 p-4 text-[#fff] no-underline hover:border-white">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-xs text-[#ecd2f3]">{strings.because.replace("{tags}", because.join(", "))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-16">
        {section("UG", "level-ug", strings.ug)}
        {section("PG", "level-pg", strings.pg)}
        {shown.length === 0 ? (
          <div className="grail-paper flex flex-col items-start gap-3 p-8">
            <p className="text-lg">{strings.none}</p>
            <button type="button" onClick={clear} className="inline-flex min-h-11 items-center rounded-full bg-[#000] px-5 font-semibold text-[#fff]">
              {strings.clear}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
