"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CompareToggle } from "@/components/programme/CompareToggle";
import { ChipRow } from "@/components/ui/ChipRow";
import { afterLoadIdle } from "@/lib/after-load";
import { understand, type Answer } from "@/lib/ask";
import { getPathname, Link } from "@/lib/i18n";
import { motionAllowed } from "@/lib/motion";
import { loadSearchIndex, matchedWords, tokenize, type SearchIndex } from "@/lib/search";
import { programmeTitleName } from "@/lib/view-transition";
import { AnswerPanel, type AnswerState } from "./AnswerPanel";

type Phone = { display: string; tel: string; label: string };
const inr = new Intl.NumberFormat("en-IN");

type Props = {
  counts: { programmes: number; colleges: number; campuses: number };
  phones: Phone[];
};

/**
 * Stanford "search is the front door" + Imperial-style peek block + York St John example prompts.
 * Without JS the form GETs /programmes (the full list). With JS, results appear as you type (en/ta/hi via the
 * lexicon), and "Find" asks /api/ask for answer cards with fees / eligibility / deadline from programmes.json.
 */
export function HeroSearch({ counts, phones }: Props) {
  const phone = phones[0]!;
  const t = useTranslations("Hero");
  const ask = useTranslations("Ask");
  const locale = useLocale();
  const examples = t.raw("examples") as string[];
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [announced, setAnnounced] = useState("");
  const [answer, setAnswer] = useState<AnswerState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = useRef(false);
  const id = useId();

  const ensureSearcher = () => {
    if (loading.current) return;
    loading.current = true;
    // Index (docs + lexicon) is a static per-language JSON fetched with Fuse on first use — not in the HTML.
    loadSearchIndex(locale)
      .then(setIndex)
      .catch(() => {
        loading.current = false;
      });
  };

  // Warm up Fuse after load + idle (never during first paint); typing or focusing loads it immediately anyway.
  useEffect(
    () => afterLoadIdle(() => ensureSearcher()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
    [],
  );

  // Rotate example prompts in the placeholder — only while idle, and never under reduced motion / Lite Mode.
  useEffect(() => {
    if (focused || query || !motionAllowed()) return;
    const timer = window.setInterval(() => setExampleIndex((i) => (i + 1) % examples.length), 2800);
    return () => window.clearInterval(timer);
  }, [focused, query, examples.length]);

  const trimmed = query.trim();
  // Tamil / Hindi words are mapped to English tags first, so instant results work in every language.
  const understood = useMemo(() => (index && trimmed ? understand(trimmed, index.lexicon) : null), [index, trimmed]);
  const results = useMemo(() => {
    if (!index || !understood) return [];
    const ranked = index.search(understood.searchText, 8);
    const atLevel = understood.level ? ranked.filter((r) => r.level === understood.level) : ranked;
    return (atLevel.length ? atLevel : ranked).slice(0, 3);
  }, [index, understood]);
  const understoodWords = [...new Set(understood?.terms.map((x) => x.said) ?? [])];
  const searching = trimmed.length > 0;

  // Announce the result count once typing settles, not on every keystroke.
  useEffect(() => {
    if (!searching || !index) return setAnnounced("");
    const timer = window.setTimeout(() => setAnnounced(t("status", { count: results.length })), 600);
    return () => window.clearTimeout(timer);
  }, [searching, index, results.length, t]);

  const fill = (example: string) => {
    setQuery(example);
    setAnswer({ status: "idle" });
    ensureSearcher();
    inputRef.current?.focus();
  };

  return (
    <form
      role="search"
      action={getPathname({ href: "/programmes", locale })}
      method="get"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!trimmed) return inputRef.current?.focus();
        setAnswer({ status: "loading" });
        try {
          const res = await fetch(`/api/ask?q=${encodeURIComponent(trimmed)}&locale=${locale}`);
          if (!res.ok) throw new Error(String(res.status));
          setAnswer({ status: "done", data: (await res.json()) as Answer });
        } catch {
          setAnswer({ status: "error" });
        }
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
          name="q"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAnswer({ status: "idle" });
            ensureSearcher();
          }}
          onFocus={() => {
            setFocused(true);
            ensureSearcher();
          }}
          onBlur={() => setFocused(false)}
          placeholder={`${t("tryLabel")}: ${examples[exampleIndex]}`}
          className="min-h-12 flex-1 rounded-t-3xl bg-transparent px-4 text-sm text-ink text-ellipsis placeholder:text-ink/70 focus:outline-none sm:min-h-14 sm:px-6 sm:text-base lg:min-h-16 lg:text-lg"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-action px-5 font-semibold text-on-action no-underline hover:bg-fg hover:text-paper lg:min-h-14 lg:px-7 lg:text-lg"
        >
          {t("submit")}
        </button>
      </div>

      {/* Gold = action (§4). Ink focus rings and links inside it: blue would fail contrast on gold. */}
      <div className="rounded-b-3xl bg-action p-4 text-on-action [--focus:var(--ink)] [--link:var(--ink)] lg:p-6">
        <p id={`${id}-status`} aria-live="polite" className="sr-only">
          {announced}
        </p>

        {answer.status !== "idle" ? (
          <AnswerPanel state={answer} phones={phones} onBack={() => setAnswer({ status: "idle" })} />
        ) : !searching ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <div>
                <p className="font-display text-xl leading-tight font-bold lg:text-2xl">{t("peekTitle")}</p>
                <p className="text-sm">{t("peekMeta", counts)}</p>
              </div>
              <SeeAll label={t("seeAll")} />
            </div>
            {/* Phones: one swipeable row bleeding to the card edge, so the hero video isn't buried under chips. */}
            <ChipRow className="mt-3 flex flex-wrap items-center gap-2 max-sm:-mx-4 max-sm:px-4">
              <span className="shrink-0 text-sm font-semibold">{t("tryLabel")}:</span>
              {examples.slice(0, 4).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => fill(ex)}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-ink/50 px-4 text-sm whitespace-nowrap hover:bg-ink hover:text-action"
                >
                  {ex}
                </button>
              ))}
            </ChipRow>
          </>
        ) : results.length > 0 ? (
          <>
            {understoodWords.length || understood?.level ? (
              <p className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-semibold">{t("understood")}:</span>
                {understoodWords.map((w) => (
                  <span key={w} className="live-chip rounded-full bg-ink px-2.5 py-0.5 text-paper">
                    {w}
                  </span>
                ))}
                {understood?.level ? (
                  <span className="live-chip rounded-full bg-ink px-2.5 py-0.5 text-paper">{understood.level === "UG" ? ask("levelUG") : ask("levelPG")}</span>
                ) : null}
              </p>
            ) : null}
            <ul className="grid gap-2 md:grid-cols-3">
              {results.map((r, i) => {
                const matched = understood ? matchedWords(understood, tokenize(trimmed), r.tags, [r.alt, r.name]) : [];
                return (
                  <li key={r.slug} style={{ "--i": i } as React.CSSProperties} className="live-card flex flex-col rounded-2xl bg-paper/75 hover:bg-paper">
                    <Link href={`/programmes/${r.slug}`} className="flex min-h-11 flex-1 flex-col gap-1 p-4 pb-2 text-ink no-underline">
                      <span className="text-sm">
                        {r.college} · {r.level}
                        {r.durationYears ? ` · ${t("years", { count: r.durationYears })}` : ""}
                      </span>
                      <span style={programmeTitleName(r.slug)} className="block leading-snug font-semibold">
                        {r.name}
                      </span>
                      <span className="text-sm font-semibold">
                        {r.feesPerYearINR ? ask("feesValue", { amount: inr.format(r.feesPerYearINR) }) : `${ask("fees")}: ${ask("notPublished")}`}
                      </span>
                      {matched.length ? <span className="text-sm">{ask("why", { terms: matched.map((m) => `“${m}”`).join(", ") })}</span> : null}
                    </Link>
                    <CompareToggle slug={r.slug} name={r.name} className="self-start px-4 pb-1 text-ink" />
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex justify-end">
              <SeeAll label={t("seeAll")} />
            </div>
          </>
        ) : index ? (
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
