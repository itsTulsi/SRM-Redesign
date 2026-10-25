"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { Answer } from "@/lib/ask";
import { Link } from "@/lib/i18n";

export type AnswerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; data: Answer };

type Phone = { display: string; tel: string; label: string };

const inr = new Intl.NumberFormat("en-IN");

/**
 * Answer cards for the hero matcher. Every fact shown comes from programmes.json via /api/ask; anything not
 * verified says so ("Not published yet — ask admissions"). Low confidence: no guesses, just people to call.
 */
export function AnswerPanel({ state, phones, onBack }: { state: AnswerState; phones: Phone[]; onBack: () => void }) {
  const t = useTranslations("Ask");
  const hero = useTranslations("Hero");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.status === "done") headingRef.current?.focus();
  }, [state]);

  const callList = (
    <ul className="mt-2 flex flex-wrap gap-2">
      {phones.map((p) => (
        <li key={p.tel}>
          <a href={`tel:${p.tel}`} className="inline-flex min-h-11 flex-col justify-center rounded-xl bg-paper/75 px-4 py-1.5 text-ink no-underline hover:bg-paper">
            <span className="font-semibold">{p.display}</span>
            <span className="text-xs">{p.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );

  if (state.status === "loading") {
    return (
      <p role="status" className="min-h-11 py-2 font-semibold">
        {t("finding")}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert">
        <p>{t("error")}</p>
        {callList}
      </div>
    );
  }

  if (state.status !== "done") return null;
  const { data } = state;

  return (
    <div className="flex flex-col gap-3">
      {data.confidence === "high" ? (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="font-display text-lg leading-snug font-bold lg:text-xl">
            {t("bestFor", { q: data.query })}
          </h2>
          <ul className="grid gap-2 md:grid-cols-3">
            {data.cards.map((c) => (
              <li key={c.slug} className="flex flex-col gap-2 rounded-2xl bg-paper/80 p-4 text-ink">
                <p className="text-sm">
                  {c.college} · {c.level === "UG" ? t("levelUG") : t("levelPG")}
                  {c.durationYears ? ` · ${hero("years", { count: c.durationYears })}` : ""} · {c.campuses.join(", ")}
                </p>
                <h3 className="leading-snug font-semibold">{c.name}</h3>
                <p className="text-sm">{t("why", { terms: c.matched.map((m) => `“${m}”`).join(", ") })}</p>
                {c.placesNotListed.length ? (
                  <p className="rounded-lg border border-ink/30 px-2 py-1 text-sm">
                    {t("notListedAt", { listed: c.campuses.join(", "), asked: c.placesNotListed.join(", ") })}
                  </p>
                ) : null}
                {(() => {
                  // Show the facts we have; name the missing ones once instead of repeating "not published".
                  const rows = [
                    { label: t("fees"), value: c.facts.feesPerYearINR ? t("feesValue", { amount: inr.format(c.facts.feesPerYearINR) }) : null },
                    { label: t("eligibility"), value: c.facts.eligibility },
                    { label: t("entrance"), value: c.facts.entrance },
                    { label: t("deadline"), value: c.facts.deadline },
                  ];
                  const known = rows.filter((r) => r.value);
                  const missing = rows.filter((r) => !r.value).map((r) => r.label);
                  return (
                    <div className="border-t border-ink/20 pt-2 text-sm">
                      {known.length ? (
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                          {known.map((r) => (
                            <div key={r.label} className="contents">
                              <dt className="font-semibold">{r.label}</dt>
                              <dd>{r.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {missing.length ? <p className={known.length ? "mt-1" : ""}>{t("missingFacts", { list: missing.join(", ") })}</p> : null}
                    </div>
                  );
                })()}
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm font-semibold">
                  <Link href={`/programmes/${c.slug}`} className="inline-flex min-h-11 items-center text-ink underline">
                    {t("details")}
                  </Link>
                  <Link href={`/admissions?programme=${c.slug}#enquiry`} className="inline-flex min-h-11 items-center text-ink underline">
                    {t("enquire")}
                  </Link>
                  {c.source ? (
                    <a href={c.source} className="inline-flex min-h-11 items-center font-normal text-ink underline">
                      {t("source")}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="font-display text-lg font-bold lg:text-xl">
            {t("notSure")}
          </h2>
          <p className="mt-1">{t("notSureBody")}</p>
          {callList}
          <p className="mt-3 text-sm">
            <Link href="/admissions#enquiry" className="font-semibold text-ink underline">
              {t("enquireGeneral")}
            </Link>{" "}
            · {t("tryWords")}
          </p>
        </div>
      )}
      <button type="button" onClick={onBack} className="inline-flex min-h-11 w-fit items-center text-sm font-semibold underline">
        ← {t("back")}
      </button>
    </div>
  );
}
