"use client";

import { useId, useState } from "react";
import { Link } from "@/lib/i18n";

export type Stat = "build" | "think" | "connect" | "grow";
type Quest = { id: string; title: string; stat: Stat; href: string };
type Path = { id: string; label: string; stats: Record<Stat, number>; quests: Quest[] };
type Strings = {
  legend: string;
  name: string;
  year: string;
  level: string;
  levelUp: string;
  xp: string;
  empty: string;
  firstQuests: string;
  statNames: Record<Stat, string>;
  announce: Record<string, string>;
};

const STATS: Stat[] = ["build", "think", "connect", "grow"];
const START: Record<Stat, number> = { build: 1, think: 1, connect: 1, grow: 1 };

/**
 * The hero's character sheet. Pick a path (a real radio group) and the card fills: four stats move, the level goes
 * up, and three real SRM quests appear. The stats are a game, not a claim about anyone; the quests are real.
 */
export function CharacterCard({ paths, strings, crest }: { paths: Path[]; strings: Strings; crest: React.ReactNode }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const id = useId();
  const path = paths.find((p) => p.id === chosen) ?? null;
  const stats = path?.stats ?? START;
  const total = STATS.reduce((sum, s) => sum + stats[s], 0);
  const level = path ? 2 : 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <fieldset>
        <legend className="mb-4 text-lg font-semibold">{strings.legend}</legend>
        <div className="flex flex-wrap gap-2">
          {paths.map((p) => (
            <label key={p.id} className="grail-chip cursor-pointer">
              <input
                type="radio"
                name={`${id}-path`}
                value={p.id}
                checked={chosen === p.id}
                onChange={() => {
                  setChosen(p.id);
                  setBurst((b) => b + 1);
                }}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-12 items-center rounded-full border-2 border-[var(--line)] px-5 text-base font-semibold transition-colors peer-checked:border-[var(--action)] peer-checked:bg-[var(--action)] peer-checked:text-[var(--on-action)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--focus)] hover:border-[var(--fg)]">
                {p.label}
              </span>
            </label>
          ))}
        </div>
        <p aria-live="polite" className="sr-only">
          {path ? strings.announce[path.id] : ""}
        </p>
      </fieldset>

      {/* The card */}
      <div className="grail-card relative overflow-hidden rounded-[28px] bg-[#F5F5F5] p-5 text-[#000000] shadow-2xl sm:p-7">
        {burst ? <span key={burst} aria-hidden="true" className="grail-burst" /> : null}
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 sm:size-20">{crest}</div>
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-grail-serif)] text-4xl leading-none uppercase sm:text-5xl">{strings.name}</p>
            <p className="mt-1 text-sm text-[#555555]">{strings.year}</p>
          </div>
          <p className="rounded-full bg-[#000000] px-3 py-1.5 text-sm font-semibold text-[#F5F5F5]">
            {strings.level.replace("{n}", String(level))}
          </p>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold tracking-wide text-[#555555]">
            <span>{strings.xp}</span>
            {path ? (
              <span key={burst} className="grail-levelup text-[#000000]">
                {strings.levelUp}
              </span>
            ) : null}
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#E2E2E2]">
            <div className="grail-bar h-full origin-left rounded-full bg-[#000000]" style={{ transform: `scaleX(${Math.min(total / 30, 1)})` }} />
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
          {STATS.map((s) => (
            <li key={s}>
              <span className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{strings.statNames[s]}</span>
                <span className="font-[family-name:var(--font-grail-serif)] text-2xl leading-none">{stats[s]}</span>
              </span>
              <span aria-hidden="true" className="mt-1 block h-2 overflow-hidden rounded-full bg-[#E2E2E2]">
                <span className="grail-bar block h-full origin-left rounded-full" style={{ transform: `scaleX(${stats[s] / 10})`, background: `var(--stat-${s})` }} />
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-[#E2E2E2] pt-4">
          {path ? (
            <>
              <p className="text-sm font-semibold text-[#555555]">{strings.firstQuests}</p>
              <ul className="mt-2 flex flex-col">
                {path.quests.map((q) => (
                  <li key={q.id}>
                    <Link href={q.href} className="flex min-h-11 items-center gap-3 py-1 font-semibold text-[#000000] no-underline hover:underline">
                      <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: `var(--stat-${q.stat})` }} />
                      {q.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="min-h-11 text-[#555555]">{strings.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
