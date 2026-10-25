"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/i18n";
import type { MapCampus, MapCluster } from "@/lib/map";
import { StreetMap } from "./StreetMap";

type View = { kind: "all" } | { kind: "cluster"; id: MapCluster["id"] } | { kind: "campus"; slug: MapCampus["slug"] };

/**
 * Campus constellation (CLAUDE.md §1.5 / step 9). Stylised India (static SVG image) with pins as real links:
 * without JS every pin and list item goes to its campus page; with JS they "fly" the camera there and open the
 * detail panel (address, directions, static street map, 360° tour in a modal).
 * The camera is one CSS transform (translate + scale) on the map stage; pins counter-scale to stay crisp.
 */
export function CampusExplorer({
  campuses,
  clusters,
  aspect,
  mapSrc,
}: {
  campuses: MapCampus[];
  clusters: MapCluster[];
  aspect: number;
  mapSrc: string;
}) {
  const t = useTranslations("Acts.explore");
  const [view, setView] = useState<View>({ kind: "all" });
  const [announce, setAnnounce] = useState("");
  const tourRef = useRef<HTMLDialogElement>(null);
  const [tourOpen, setTourOpen] = useState(false);
  // Narrow maps (phones) zoom further into a region so 44px pin targets never overlap (WCAG 2.2 target size).
  const mapRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCompact((entry?.contentRect.width ?? 999) < 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bySlug = (slug: string) => campuses.find((c) => c.slug === slug)!;
  const clusterName = (id: MapCluster["id"]) => (id === "chennai" ? t("clusterChennai") : t("clusterDelhi"));
  const selected = view.kind === "campus" ? bySlug(view.slug) : null;

  // Camera target: point (fraction of map) to centre + zoom.
  const camera = (() => {
    const boost = compact ? 1.5 : 1;
    if (view.kind === "cluster") {
      const cl = clusters.find((c) => c.id === view.id)!;
      return { x: cl.x, y: cl.y, z: cl.zoom * boost };
    }
    if (selected) {
      const cl = selected.cluster ? clusters.find((c) => c.id === selected.cluster) : null;
      return { x: selected.x, y: selected.y, z: (cl ? cl.zoom : 7) * boost };
    }
    return { x: 0.5, y: 0.5, z: 1 };
  })();
  const zoomed = view.kind !== "all";

  const select = (next: View, label: string) => (e?: React.MouseEvent) => {
    e?.preventDefault();
    setView(next);
    setAnnounce(t("selected", { name: label }));
  };

  useEffect(() => {
    const dialog = tourRef.current;
    if (!dialog) return;
    if (tourOpen && !dialog.open) dialog.showModal();
    if (!tourOpen && dialog.open) dialog.close();
  }, [tourOpen]);

  // Overview markers: one per cluster + every campus not in a cluster.
  const overviewMarkers = [
    ...clusters.map((cl) => ({
      key: cl.id,
      x: cl.x,
      y: cl.y,
      label: `${clusterName(cl.id)} · ${t("campusesCount", { count: cl.members.length })}`,
      href: `/campuses/${cl.members[0]}`,
      onClick: select({ kind: "cluster", id: cl.id }, clusterName(cl.id)),
      count: cl.members.length,
      left: false,
    })),
    ...campuses
      .filter((c) => !c.cluster)
      .map((c) => ({
        key: c.slug,
        x: c.x,
        y: c.y,
        label: c.name,
        href: `/campuses/${c.slug}`,
        onClick: select({ kind: "campus", slug: c.slug }, c.name),
        count: 0,
        left: c.labelLeft,
      })),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      {/* ── Map ── */}
      <div
        ref={mapRef}
        role="group"
        aria-label={t("mapLabel")}
        className="relative overflow-hidden rounded-3xl border border-line-subtle bg-[#0a1640] lg:col-span-7"
        style={{ aspectRatio: aspect }}
      >
        <div
          className="campus-stage absolute inset-0 origin-top-left"
          style={
            {
              "--z": camera.z,
              transform: `translate(${(0.5 - camera.z * camera.x) * 100}%, ${(0.5 - camera.z * camera.y) * 100}%) scale(${camera.z})`,
            } as React.CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art; next/image adds nothing for SVG */}
          <img src={mapSrc} alt="" aria-hidden="true" loading="lazy" decoding="async" className="size-full select-none" draggable={false} />

          {(zoomed ? [] : overviewMarkers).map((m) => (
            <Pin key={m.key} x={m.x} y={m.y} label={m.label} href={m.href} onClick={m.onClick} count={m.count} left={m.left} cursorLabel={t("exploreCursor")} />
          ))}
          {zoomed
            ? campuses
                // Only pins inside the visible window: off-screen pins would still take (invisible) keyboard focus.
                .filter((c) => Math.abs((c.x - camera.x) * camera.z) < 0.5 && Math.abs((c.y - camera.y) * camera.z) < 0.5)
                .map((c) => (
                <Pin
                  key={c.slug}
                  x={c.x}
                  y={c.y}
                  nudge={c.nudge}
                  label={c.name}
                  href={`/campuses/${c.slug}`}
                  onClick={select({ kind: "campus", slug: c.slug }, c.name)}
                  active={selected?.slug === c.slug}
                  sister={c.kind === "sister"}
                  left={c.labelLeft}
                  cursorLabel={t("exploreCursor")}
                />
              ))
            : null}
        </div>
        {zoomed ? (
          <button
            type="button"
            onClick={() => select({ kind: "all" }, t("back"))()}
            className="absolute top-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-bg/90 px-4 text-sm font-semibold"
          >
            <span aria-hidden="true">←</span> {t("back")}
          </button>
        ) : null}
      </div>

      {/* ── Panel ── */}
      <div className="lg:col-span-5">
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>

        {selected ? (
          <CampusDetail campus={selected} onTour={() => setTourOpen(true)} />
        ) : view.kind === "cluster" ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-3xl font-bold">{clusterName(view.id)}</h3>
            <CampusList
              items={clusters.find((c) => c.id === view.id)!.members.map(bySlug)}
              onSelect={(c) => select({ kind: "campus", slug: c.slug }, c.name)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h3 className="font-display text-3xl font-bold">{t("findCampus")}</h3>
            <div>
              <h4 className="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("ourCampuses")}</h4>
              <CampusList items={campuses.filter((c) => c.kind === "campus")} onSelect={(c) => select({ kind: "campus", slug: c.slug }, c.name)} />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("sisters")}</h4>
              <CampusList items={campuses.filter((c) => c.kind === "sister")} onSelect={(c) => select({ kind: "campus", slug: c.slug }, c.name)} />
            </div>
          </div>
        )}
      </div>

      {/* ── 360° tour, in the page (Sydney "Here" / Ravensbourne) ── */}
      {selected?.tour ? (
        <dialog
          ref={tourRef}
          data-lenis-prevent
          aria-label={t("tourTitle", { name: selected.name })}
          onClose={() => setTourOpen(false)}
          className="m-auto h-[90dvh] max-h-none w-[min(96vw,80rem)] max-w-none overflow-hidden rounded-3xl border border-line bg-bg p-0 text-fg backdrop:bg-ink/80"
        >
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-3">
              <h3 className="font-display text-xl font-bold">{t("tourTitle", { name: selected.name })}</h3>
              <div className="flex items-center gap-3">
                <a href={selected.tour} target="_blank" rel="noopener" className="text-sm">
                  {t("newTab")}
                </a>
                <button
                  type="button"
                  onClick={() => setTourOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 font-semibold"
                >
                  {t("closeTour")}
                </button>
              </div>
            </div>
            {tourOpen ? (
              <iframe src={selected.tour} title={t("tourTitle", { name: selected.name })} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen className="w-full flex-1 border-0" />
            ) : null}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function CampusDetail({ campus, onTour }: { campus: MapCampus; onTour: () => void }) {
  const t = useTranslations("Acts.explore");
  return (
    <article aria-labelledby={`campus-${campus.slug}`} className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
          {campus.kind === "sister" ? t("sisterBadge") : campus.isMain ? t("main") : `${campus.city}, ${campus.state}`}
        </p>
        <h3 id={`campus-${campus.slug}`} className="mt-1 font-display text-3xl font-bold">
          {campus.name}
        </h3>
        <p className="mt-2 text-fg-muted">{campus.address ?? `${campus.city}, ${campus.state}`}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {campus.tour ? (
          <button
            type="button"
            onClick={onTour}
            data-magnetic
            className="relative inline-flex min-h-11 items-center overflow-hidden rounded-full bg-fg px-5 font-semibold text-bg"
          >
            {t("tour")}
          </button>
        ) : null}
        <a href={campus.directions} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg">
          {t("directions")}
        </a>
        {campus.kind === "sister" ? (
          <a href={campus.website} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg">
            {t("website")}
          </a>
        ) : (
          <Link href={`/campuses/${campus.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold text-fg no-underline hover:border-fg">
            {t("campusPage")}
          </Link>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">{t("streetMap")}</h4>
        <StreetMap
          image={campus.street.image}
          link={campus.street.link}
          alt={`${t("streetMap")}: ${campus.name}`}
          linkLabel={t("openMap")}
          approx={campus.coordsApprox}
        />
        {campus.coordsApprox ? <p className="mt-2 text-sm text-fg-muted">{t("approx")}</p> : null}
      </div>
    </article>
  );
}

function CampusList({ items, onSelect }: { items: MapCampus[]; onSelect: (c: MapCampus) => (e?: React.MouseEvent) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/campuses/${c.slug}`}
            onClick={onSelect(c)}
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line-subtle px-4 py-3 text-fg no-underline hover:border-line"
          >
            <span>
              <span className="block font-semibold">{c.name}</span>
              <span className="block text-sm text-fg-muted">
                {c.city}, {c.state}
              </span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Pin({
  x,
  y,
  nudge = [0, 0],
  label,
  href,
  onClick,
  count = 0,
  active = false,
  sister = false,
  left = false,
  cursorLabel,
}: {
  x: number;
  y: number;
  nudge?: [number, number];
  label: string;
  href: string;
  onClick: (e?: React.MouseEvent) => void;
  count?: number;
  active?: boolean;
  sister?: boolean;
  left?: boolean;
  cursorLabel: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      data-cursor-label={cursorLabel}
      className="campus-pin group absolute flex min-h-11 min-w-11 items-center justify-center text-fg no-underline"
      style={
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          "--nx": `${nudge[0]}px`,
          "--ny": `${nudge[1]}px`,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className={`campus-pin-dot relative grid place-items-center rounded-full border-2 font-display text-xs font-bold ${
          count ? "size-8 border-bg bg-tree text-ink" : active ? "size-5 border-bg bg-action" : sister ? "size-4 border-tree bg-bg" : "size-4 border-bg bg-tree"
        }`}
      >
        {count || null}
      </span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-md bg-bg/85 px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
          left ? "right-full mr-0.5" : "left-full ml-0.5"
        } ${active ? "text-action" : ""}`}
      >
        {label}
      </span>
    </Link>
  );
}
