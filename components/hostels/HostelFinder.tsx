"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import type { Aircon, Washroom } from "@/lib/hostels";

// three.js arrives only when the 3D view is about to be seen, and never in Lite Mode.
const HostelScene = dynamic(() => import("./HostelScene"), { ssr: false });

export type FinderBlock = {
  slug: string;
  name: string;
  group: "men" | "women" | "international";
  ac?: Aircon;
  washroom?: Washroom;
  sharing?: string;
  floors?: string;
  phone: string;
  tel: string;
  photo: string | null;
  mapped: boolean;
  offCampus?: boolean;
  feeFrom: string | null;
};

type Group = "all" | FinderBlock["group"];
const GROUPS: Group[] = ["all", "men", "women", "international"];
const ANCHOR: Record<FinderBlock["group"], string> = { men: "#men", women: "#women", international: "#international" };

const webgl = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

/**
 * "Pick your hostel": a 3D model of the campus beside a plain list of every hostel. Choosing one, in either,
 * flies the camera there and opens its "inside" card: entrance photo, rooms, this year's fees and the office phone.
 * The list is the accessible path and works with no 3D at all (Lite Mode, no WebGL, or before the model loads).
 */
export function HostelFinder({ blocks, feeYear }: { blocks: FinderBlock[]; feeYear: string }) {
  const h = useTranslations("Hostels");
  // Keys under Hostels.finder and Hostels.block (next-intl's types want the full path from "Hostels").
  const say = h as unknown as (key: string, values?: Record<string, string>) => string;
  const t = (k: string, v?: Record<string, string>) => say(`finder.${k}`, v);
  const tb = (k: string, v?: Record<string, string>) => say(`block.${k}`, v);
  const { lite } = useLiteMode();
  const [group, setGroup] = useState<Group>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gl, setGl] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => setGl(webgl()), []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setNear(true);
        setVisible(!!e?.isIntersecting);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show3d = !lite && gl;
  const list = blocks.filter((b) => group === "all" || b.group === group);
  const pick = (slug: string) => {
    setSelected(slug);
    const b = blocks.find((x) => x.slug === slug);
    if (b && group !== "all" && b.group !== group) setGroup("all");
  };
  const chosen = blocks.find((b) => b.slug === selected) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* ── The 3D campus (decorative: the list on the right does the same job) ── */}
      <div className="flex flex-col gap-3">
        <div ref={stage} aria-hidden="true" className="hostel-stage relative h-[56vh] min-h-[22rem] overflow-hidden rounded-[28px] border border-white/15 bg-[#0a0f0b] lg:h-[40rem]">
          {show3d ? (
            near ? (
              <HostelScene selected={selected} onPick={pick} active={visible} loadingLabel={t("loading")} />
            ) : (
              <p className="grid h-full place-items-center text-sm text-[var(--fg-muted)]">{t("loading")}</p>
            )
          ) : (
            <p className="grid h-full place-items-center px-8 text-center text-[var(--fg-muted)]">{lite ? t("lite") : t("noWebgl")}</p>
          )}
          {show3d ? (
            <>
              <ul className="pointer-events-none absolute top-4 left-4 flex flex-wrap gap-2 text-xs font-semibold">
                {(["men", "women", "selected"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur">
                    <span className="size-2.5 rounded-full" style={{ background: k === "men" ? "#9ee3ff" : k === "women" ? "#ffcdff" : "#ecd2f3", boxShadow: k === "selected" ? "0 0 0 2px #623562" : undefined }} />
                    {t(`legend.${k}`)}
                  </li>
                ))}
              </ul>
              <p className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur">{t("drag")}</p>
            </>
          ) : null}
        </div>
        {show3d && selected ? (
          <button type="button" onClick={() => setSelected(null)} className="inline-flex min-h-11 w-fit items-center rounded-full border border-[var(--line)] px-5 text-sm font-semibold hover:border-[var(--fg)]">
            ← {t("back")}
          </button>
        ) : null}
        <p className="text-xs text-[var(--fg-muted)]">{t("credit")}</p>
      </div>

      {/* ── The list and the "inside" card ── */}
      <div className="flex min-w-0 flex-col gap-5">
        <div ref={card} aria-live="polite">
          {chosen ? (
            <article aria-labelledby="hostel-inside" className="grail-paper overflow-hidden">
              {chosen.photo ? (
                <figure className="relative aspect-[16/10] w-full">
                  <Image src={chosen.photo} alt={tb("photoAlt", { name: chosen.name })} fill sizes="(min-width: 1024px) 24rem, 100vw" className="object-cover" />
                  <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">{t("entrance")}</figcaption>
                </figure>
              ) : null}
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                    {t(`filters.${chosen.group}`)} · {chosen.offCampus ? tb("offCampus") : tb("onCampus")}
                  </p>
                  <h3 id="hostel-inside" className="grail-num mt-1 text-3xl uppercase">
                    {t("inside", { name: chosen.name })}
                  </h3>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{t("rooms")}</h4>
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {[
                      chosen.ac ? tb(chosen.ac) : null,
                      chosen.washroom ? tb(`washroom.${chosen.washroom}`) : null,
                      chosen.sharing ? tb("sharing", { n: chosen.sharing }) : null,
                      chosen.floors ? tb("floors", { n: chosen.floors }) : null,
                    ]
                      .filter(Boolean)
                      .map((x) => (
                        <li key={x} className="rounded-full border border-[var(--line)] px-3 py-1">
                          {x}
                        </li>
                      ))}
                  </ul>
                </div>
                {chosen.feeFrom ? (
                  <p>
                    <span className="block text-sm font-semibold">{t("fees", { year: feeYear })}</span>
                    <span className="text-lg">{t("feesFrom", { amount: chosen.feeFrom })}</span>
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <a href={chosen.tel} className="inline-flex min-h-11 flex-col justify-center rounded-2xl bg-[#000000] px-4 py-1.5 text-[#ffffff] no-underline">
                    <span className="text-xs text-[#b8b8b8]">{t("call")}</span>
                    <span className="font-semibold">{chosen.phone}</span>
                  </a>
                  <a href={ANCHOR[chosen.group]} className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 font-semibold no-underline">
                    {t("details")}
                  </a>
                </div>
              </div>
            </article>
          ) : (
            <p className="rounded-2xl border border-white/15 p-5 text-[var(--fg-muted)]">{t("pick")}</p>
          )}
        </div>

        <fieldset>
          <legend className="sr-only">{t("listLabel")}</legend>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 text-sm font-semibold aria-pressed:border-[var(--action)] aria-pressed:bg-[var(--action)] aria-pressed:text-[var(--on-action)]"
              >
                {t(`filters.${g}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <ul aria-label={t("listLabel")} className="flex max-h-[26rem] flex-col overflow-y-auto rounded-2xl border border-white/15" tabIndex={0}>
          {list.map((b) => (
            <li key={b.slug} className="border-b border-white/10 last:border-b-0">
              <button
                type="button"
                aria-pressed={b.slug === selected}
                onClick={() => {
                  pick(b.slug);
                  card.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-white/5 aria-pressed:bg-[var(--action)] aria-pressed:text-[var(--on-action)]"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: b.group === "women" ? "#ffcdff" : b.group === "men" ? "#9ee3ff" : "#ffc63a" }} />
                  <span className="font-semibold">{b.name}</span>
                </span>
                <span className="text-xs opacity-75">{b.mapped ? t("onMap") : t("notOnMap")}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
