"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getPathname, Link } from "@/lib/i18n";
import { motionAllowed } from "@/lib/motion";
import { loadSearcher, type SearchDoc, type Searcher } from "@/lib/search";

type Props = {
  docs: SearchDoc[];
  counts: { programmes: number; colleges: number; campuses: number };
  phone: { display: string; tel: string };
};

/**
 * Stanford "search is the front door" + Imperial lime peek block + York St John example prompts.
 * Without JS the form GETs /programmes (the full list). With JS, results appear as you type.
 */
export function HeroSearch({ docs, counts, phone }: Props) {
  const t = useTranslations("Hero");
  const locale = useLocale();
  const examples = t.raw("examples") as string[];
  const [query, setQuery] = useState("");
  const [searcher, setSearcher] = useState<Searcher | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [announced, setAnnounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const firstResultRef = useRef<HTMLAnchorElement>(null);
  const loading = useRef(false);
  const id = useId();

  const ensureSearcher = () => {
    if (loading.current) return;
    loading.current = true;
    loadSearcher(docs).then(
      // The searcher is a function: wrap it, or React treats it as a state updater and calls it.
      (fn) => setSearcher(() => fn),
      () => {
        loading.current = false;
      },
    );
  };

  // Warm up Fuse when the browser is idle, so the first keystroke is instant.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => ensureSearcher());
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);

  // Rotate example prompts in the placeholder — only while idle, and never under reduced motion / Lite Mode.
  useEffect(() => {
    if (focused || query || !motionAllowed()) return;
    const timer = window.setInterval(() => setExampleIndex((i) => (i + 1) % examples.length), 2800);
    return () => window.clearInterval(timer);
  }, [focused, query, examples.length]);

  const trimmed = query.trim();
  const results = useMemo(() => (searcher && trimmed ? searcher(trimmed) : []), [searcher, trimmed]);
  const searching = trimmed.length > 0;

  // Announce the result count once typing settles, not on every keystroke.
  useEffect(() => {
    if (!searching || !searcher) return setAnnounced("");
    const timer = window.setTimeout(() => setAnnounced(t("status", { count: results.length })), 600);
    return () => window.clearTimeout(timer);
  }, [searching, searcher, results.length, t]);

  const fill = (example: string) => {
    setQuery(example);
    ensureSearcher();
    inputRef.current?.focus();
  };

  return (
    <form
      role="search"
      action={getPathname({ href: "/programmes", locale })}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        // Step 10 sends this to /api/ask. For now: Enter takes keyboard users straight to the results.
        if (results.length) firstResultRef.current?.focus();
        else inputRef.current?.focus();
      }}
      className="mt-8 max-w-4xl"
    >
      <label htmlFor={`${id}-q`} className="sr-only">
        {t("inputLabel")}
      </label>
      <div className="flex items-center gap-2 rounded-t-3xl bg-paper pr-2 text-ink outline-offset-3 outline-focus focus-within:outline-3">
        <input
          ref={inputRef}
          id={`${id}-q`}
          type="search"
          name="q"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            ensureSearcher();
          }}
          onFocus={() => {
            setFocused(true);
            ensureSearcher();
          }}
          onBlur={() => setFocused(false)}
          placeholder={`${t("tryLabel")}: ${examples[exampleIndex]}…`}
          aria-describedby={`${id}-status`}
          className="h-16 min-w-0 flex-1 bg-transparent pl-5 text-xl text-ink outline-none placeholder:text-ink/65 lg:h-20 lg:pl-7 lg:text-3xl"
        />
        <button
          type="submit"
          data-magnetic
          className="relative inline-flex min-h-12 overflow-hidden shrink-0 items-center rounded-full bg-ink px-5 font-semibold text-paper lg:min-h-14 lg:px-7 lg:text-lg"
        >
          {t("submit")}
        </button>
      </div>

      {/* Lime = action (§4). Ink focus rings and links inside it: blue would fail contrast on lime. */}
      <div className="rounded-b-3xl bg-action p-4 text-on-action [--focus:var(--ink)] [--link:var(--ink)] lg:p-6">
        <p id={`${id}-status`} aria-live="polite" className="sr-only">
          {announced}
        </p>

        {!searching ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <div>
                <p className="font-display text-xl leading-tight font-bold lg:text-2xl">{t("peekTitle")}</p>
                <p className="text-sm">{t("peekMeta", counts)}</p>
              </div>
              <SeeAll label={t("seeAll")} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t("tryLabel")}:</span>
              {examples.slice(0, 4).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => fill(ex)}
                  className="inline-flex min-h-11 items-center rounded-full border border-ink/50 px-4 text-sm hover:bg-ink hover:text-action"
                >
                  {ex}
                </button>
              ))}
            </div>
          </>
        ) : results.length > 0 ? (
          <>
            <ul className="grid gap-2 md:grid-cols-3">
              {results.map((r, i) => (
                <li key={r.slug}>
                  <Link
                    ref={i === 0 ? firstResultRef : undefined}
                    href={`/programmes#${r.slug}`}
                    className="flex h-full min-h-11 flex-col gap-1 rounded-2xl bg-paper/75 p-4 text-ink no-underline hover:bg-paper"
                  >
                    <span className="text-sm">
                      {r.college} · {r.level}
                      {r.durationYears ? ` · ${t("years", { count: r.durationYears })}` : ""}
                    </span>
                    <span className="leading-snug font-semibold">{r.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              <SeeAll label={t("seeAll")} />
            </div>
          </>
        ) : searcher ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p>
              {t("status", { count: 0 })} {t("noMatch")}{" "}
              <a href={`tel:${phone.tel}`} className="font-semibold whitespace-nowrap text-ink underline">
                {phone.display}
              </a>
            </p>
            <SeeAll label={t("seeAll")} />
          </div>
        ) : (
          <p aria-hidden="true" className="h-11" />
        )}
      </div>
    </form>
  );
}

function SeeAll({ label }: { label: string }) {
  return (
    <Link
      href="/programmes"
      className="inline-flex min-h-11 items-center gap-1 font-semibold text-ink underline underline-offset-4"
    >
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
}
