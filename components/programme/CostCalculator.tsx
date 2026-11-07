"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export type CostRoom = {
  group: "men" | "women";
  block: string;
  ac: boolean;
  sharing: string;
  hostel: number;
  mess: number;
  offCampus?: boolean;
};

type Props = {
  tuition: number | null;
  years: number;
  rooms: CostRoom[];
  laundry: { men: number; women: number };
  /** Kattankulathur hostels apply; otherwise the programme's campus name, and hostels are "ask admissions". */
  hostelCampus: string | null;
  btechRates: boolean;
  phone: { display: string; tel: string };
};

const inr = new Intl.NumberFormat("en-IN");
const rupees = (n: number) => `₹${inr.format(Math.round(n))}`;

/**
 * "What will it cost?": tuition + hostel + mess (+ laundry) over the whole course, from SRM's own published numbers
 * only (programmes.json, hostels.json). Nothing is estimated: when SRM hasn't published a figure, it says so and
 * hands over to admissions. Works without the 3D or any network call; the default (day scholar) also renders on the server.
 */
export function CostCalculator({ tuition, years, rooms, laundry, hostelCampus, btechRates, phone }: Props) {
  const t = useTranslations("Cost");
  const id = useId();
  const [live, setLive] = useState<"home" | "men" | "women">("home");
  const options = (g: "men" | "women") => rooms.filter((r) => r.group === g).sort((a, b) => a.hostel + a.mess - (b.hostel + b.mess));
  const [roomIdx, setRoomIdx] = useState(0);
  const [wash, setWash] = useState(false);

  const list = live === "home" ? [] : options(live);
  const room = list[Math.min(roomIdx, list.length - 1)];
  const rows = [
    tuition !== null ? { k: t("tuition"), year: tuition, color: "var(--action)" } : null,
    room ? { k: t("hostel"), year: room.hostel, color: "#9ee3ff" } : null,
    room ? { k: t("mess"), year: room.mess, color: "#ffcdff" } : null,
    room && wash && live !== "home" ? { k: t("laundryRow"), year: laundry[live], color: "#ffc63a" } : null,
  ].filter((r): r is { k: string; year: number; color: string } => r !== null);
  const perYear = rows.reduce((s, r) => s + r.year, 0);
  const yearsLabel = Number.isInteger(years) ? String(years) : years.toFixed(1);
  const roomLabel = (r: CostRoom) =>
    [r.block, r.ac ? t("ac") : t("nonAc"), t("sharing", { n: r.sharing }), r.offCampus ? t("offCampus") : null].filter(Boolean).join(" · ") +
    ` — ${rupees(r.hostel + r.mess)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">{t("live")}</legend>
          <div className="mt-3 flex flex-col gap-2">
            {(["home", ...(hostelCampus ? [] : (["women", "men"] as const))] as const).map((k) => (
              <label key={k} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] px-4 has-[:checked]:border-[var(--action)] has-[:checked]:bg-[var(--action)]/10">
                <input
                  type="radio"
                  name={`${id}-live`}
                  value={k}
                  checked={live === k}
                  onChange={() => {
                    setLive(k);
                    setRoomIdx(0);
                  }}
                  className="size-6 accent-[var(--action)]"
                />
                <span className="font-semibold">{t(k)}</span>
              </label>
            ))}
          </div>
          {hostelCampus ? <p className="mt-3 text-sm text-[var(--fg-muted)]">{t("noHostel", { campus: hostelCampus })}</p> : null}
        </fieldset>

        {live !== "home" ? (
          <div className="flex flex-col gap-3">
            <label htmlFor={`${id}-room`} className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
              {t("room")}
            </label>
            <select
              id={`${id}-room`}
              value={Math.min(roomIdx, list.length - 1)}
              onChange={(e) => setRoomIdx(Number(e.target.value))}
              className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-3 text-base text-[var(--fg)]"
            >
              {list.map((r, i) => (
                <option key={`${r.block}-${r.ac}-${r.sharing}-${i}`} value={i}>
                  {roomLabel(r)}
                </option>
              ))}
            </select>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={wash} onChange={(e) => setWash(e.target.checked)} className="size-6 accent-[var(--action)]" />
              <span>
                {t("laundry")} · {rupees(laundry[live])} {t("perYear")}
              </span>
            </label>
          </div>
        ) : null}
      </form>

      <div aria-live="polite" className="grail-paper flex flex-col gap-6 p-6 lg:p-8">
        {tuition === null ? <p className="text-lg">{t("noTuition")}</p> : null}
        {perYear > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              {years > 0 ? (
                <p className="flex flex-col">
                  <span key={perYear} className="grail-num grail-pop text-[clamp(2rem,5vw,3.5rem)] leading-none">{rupees(perYear * years)}</span>
                  <span className="mt-2 text-[var(--fg-muted)]">{t("total", { years: yearsLabel })}</span>
                </p>
              ) : null}
              <p className="flex flex-col">
                <span key={perYear} className="grail-num grail-pop text-[clamp(1.6rem,3.5vw,2.5rem)] leading-none">{rupees(perYear)}</span>
                <span className="mt-2 text-[var(--fg-muted)]">{t("perYear")}</span>
              </p>
            </div>
            {/* The split at a glance; the numbers are in the list below it. */}
            <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full bg-black/10">
              {rows.map((r) => (
                <span key={r.k} className="h-full transition-[width] duration-500" style={{ width: `${(r.year / perYear) * 100}%`, background: r.color }} />
              ))}
            </div>
            <dl aria-label={t("breakdown")} className="flex flex-col divide-y divide-black/10">
              {rows.map((r) => (
                <div key={r.k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <dt className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: r.color }} />
                    {r.k}
                  </dt>
                  <dd className="text-[var(--fg-muted)] tabular-nums">
                    {t("times", { amount: rupees(r.year), years: yearsLabel })} = <span className="font-semibold text-[var(--fg)]">{rupees(r.year * years)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        <div className="flex flex-col gap-2 text-sm text-[var(--fg-muted)]">
          <p>{t("notes")}</p>
          {live !== "home" ? <p>{btechRates ? t("hostelBtech") : t("hostelOther")}</p> : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("scholarship")}</span>
          <a href={`tel:${phone.tel}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            {phone.display}
          </a>
        </p>
      </div>
    </div>
  );
}
