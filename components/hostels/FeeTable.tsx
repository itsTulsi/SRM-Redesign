import { getTranslations } from "next-intl/server";
import type { FeeRow } from "@/lib/hostels";

const inr = new Intl.NumberFormat("en-IN");

/**
 * A 2026–27 fee table. Tablet and up: a real <table>. Phones: the same rows as stacked cards, so nothing scrolls
 * sideways at 360 px. Only one of the two is ever displayed, so screen readers meet the data once.
 */
export async function FeeTable({ id, caption, rows }: { id: string; caption: string; rows: FeeRow[] }) {
  const t = await getTranslations("Hostels");
  const room = (r: FeeRow) =>
    [
      t(r.ac ? "block.ac" : "block.non-ac"),
      t(`block.washroom.${r.washroom}`),
      t("block.sharing", { n: r.sharing }),
      r.note === "bunker" ? t("bunker") : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const hostelName = (r: FeeRow) => (r.offCampus ? `${r.block} (${t("block.offCampus")})` : r.block);

  return (
    <div className="flex flex-col gap-3">
      <h3 id={id} className="font-display text-2xl font-bold">
        {caption}
      </h3>

      <table aria-labelledby={id} className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-line text-fg-muted">
            <th scope="col" className="py-3 pr-4 font-semibold">{t("col.room")}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{t("col.hostel")}</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">{t("col.hostelFee")}</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">{t("col.messFee")}</th>
            <th scope="col" className="py-3 text-right font-semibold">{t("col.total")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line-subtle">
              <th scope="row" className="py-3 pr-4 font-normal">{room(r)}</th>
              <td className="py-3 pr-4">{hostelName(r)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">₹{inr.format(r.hostel)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">₹{inr.format(r.mess)}</td>
              <td className="py-3 text-right font-semibold tabular-nums">₹{inr.format(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-labelledby={id} className="flex flex-col gap-3 md:hidden">
        {rows.map((r, i) => (
          <li key={i} className="rounded-2xl border border-line-subtle p-4">
            <p className="font-semibold">{hostelName(r)}</p>
            <p className="text-sm text-fg-muted">{room(r)}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-fg-muted">{t("col.hostelFee")}</dt>
                <dd className="tabular-nums">₹{inr.format(r.hostel)}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">{t("col.messFee")}</dt>
                <dd className="tabular-nums">₹{inr.format(r.mess)}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">{t("col.total")}</dt>
                <dd className="font-semibold tabular-nums">₹{inr.format(r.total)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
