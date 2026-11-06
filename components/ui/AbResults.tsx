"use client";

import { useEffect, useState } from "react";
import type { abSummary } from "@/lib/ab-stats";

type Row = ReturnType<typeof abSummary>[number];
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Live A/B counts from /api/ab, refreshed every 10 seconds. */
export function AbResults() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/ab", { cache: "no-store" });
        if (alive) setRows(await r.json());
      } catch {
        if (alive) setError(true);
      }
    };
    void load();
    const timer = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (error) return <p>Could not reach /api/ab.</p>;
  if (!rows) return <p aria-busy="true">Loading…</p>;
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="A/B results">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--line)] text-sm text-[var(--fg-muted)]">
            <th className="py-3 pr-4">Experiment</th>
            <th className="py-3 pr-4">A: views → goals</th>
            <th className="py-3 pr-4">B: views → goals</th>
            <th className="py-3 pr-4">Lift of B</th>
            <th className="py-3 pr-4">p-value</th>
            <th className="py-3">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--line)]">
              <th scope="row" className="py-3 pr-4 font-semibold">
                {r.id}
              </th>
              <td className="py-3 pr-4 tabular-nums">
                {r.a.views} → {r.a.goals} ({pct(r.rateA)})
              </td>
              <td className="py-3 pr-4 tabular-nums">
                {r.b.views} → {r.b.goals} ({pct(r.rateB)})
              </td>
              <td className="py-3 pr-4 tabular-nums">{r.lift === null ? "—" : `${r.lift >= 0 ? "+" : ""}${pct(r.lift)}`}</td>
              <td className="py-3 pr-4 tabular-nums">{r.a.views && r.b.views ? r.p.toFixed(3) : "—"}</td>
              <td className="py-3 font-semibold">{r.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-[var(--fg-muted)]">Counts are kept by the running server and reset when it restarts; every event is also in the server log.</p>
    </div>
  );
}
