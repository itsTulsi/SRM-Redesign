"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { understand } from "@/lib/ask";
import { getPathname, localeNames, locales, usePathname, type Locale } from "@/lib/i18n";
import { setLiteOverride } from "@/lib/lite-mode";
import { readParentMode, setParentMode } from "@/lib/parent-mode";
import { loadSearchIndex, tokenize, type SearchIndex } from "@/lib/search";
import { withViewTransition } from "@/lib/view-transition";
import type { NavData } from "./types";

const inr = new Intl.NumberFormat("en-IN");
const MAX_PROGRAMMES = 5;
const MAX_PAGES = 6;

type Item = { id: string; label: string; detail?: string; lang?: string; run: () => void };
type Group = { title: string; items: Item[] };

/**
 * One box for everything: programmes (same search as the hero, in all three languages), every page in the menu, and
 * actions. A modal <dialog> with the ARIA combobox + listbox pattern: focus stays in the input, ↑↓ moves the active
 * option, Enter runs it, Esc closes and returns focus to where it was.
 */
export default function CommandPanel({ nav, open, onClose }: { nav: NavData; open: boolean; onClose: () => void }) {
  const t = useTranslations("Palette");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setActive(0);
      dialog.showModal();
      loadSearchIndex(locale)
        .then(setIndex)
        .catch(() => {});
    }
    if (!open && dialog.open) dialog.close();
  }, [open, locale]);

  const groups = useMemo<Group[]>(() => {
    const go = (href: string) => () => {
      onClose();
      if (/^(https?:|tel:|mailto:)/.test(href)) window.location.href = href;
      else withViewTransition(() => router.push(href));
    };
    // Menu links are locale-free ("/hostels"): add this language's prefix.
    const local = (href: string) => getPathname({ href, locale: locale as Locale });
    const link = (href: string) => go(/^(https?:|tel:|mailto:)/.test(href) ? href : local(href));

    const parentOn = typeof document !== "undefined" && readParentMode();
    const liteOn = typeof document !== "undefined" && document.documentElement.dataset.lite === "on";
    const actions: Item[] = [
      { id: "apply", label: nav.apply.label, run: link(nav.apply.href) },
      { id: "compare", label: nav.compare.label, run: link(nav.compare.href) },
      { id: "call", label: nav.call.label, detail: nav.call.display, run: go(`tel:${nav.call.tel}`) },
      ...locales
        .filter((l) => l !== locale)
        .map((l) => ({
          id: `lang-${l}`,
          label: t("switchTo", { language: localeNames[l] }),
          run: go(getPathname({ href: pathname, locale: l })),
        })),
      {
        id: "parent",
        label: parentOn ? t("parentOff") : t("parentOn"),
        run: () => {
          onClose();
          setParentMode(!parentOn);
        },
      },
      {
        id: "lite",
        label: liteOn ? t("liteOff") : t("liteOn"),
        run: () => {
          onClose();
          setLiteOverride(liteOn ? "off" : "on");
        },
      },
    ];

    // Already an action above.
    const seen = new Set<string>([nav.compare.href]);
    const pages = nav.sections.flatMap((section) =>
      section.groups.flatMap((group) =>
        group.links
          .filter((l) => !seen.has(l.href) && seen.add(l.href))
          .map((l) => ({ id: `page-${l.href}`, label: l.label, detail: `${section.label} · ${group.title}`, run: link(l.href) })),
      ),
    );

    const trimmed = query.trim();
    if (!trimmed) {
      return [
        { title: t("actions"), items: actions },
        { title: t("pages"), items: pages.slice(0, MAX_PAGES) },
      ];
    }

    const words = tokenize(trimmed);
    const needles = words.length ? words : [trimmed.toLowerCase()];
    const hit = (item: Item) => {
      const text = `${item.label} ${item.detail ?? ""}`.toLowerCase();
      return needles.every((w) => text.includes(w));
    };

    let programmes: Item[] = [];
    if (index) {
      const u = understand(trimmed, index.lexicon);
      const ranked = index.search(u.searchText, MAX_PROGRAMMES * 2);
      const atLevel = u.level ? ranked.filter((r) => r.level === u.level) : ranked;
      programmes = (atLevel.length ? atLevel : ranked).slice(0, MAX_PROGRAMMES).map((r) => ({
        id: `programme-${r.slug}`,
        label: r.name,
        detail: [r.college, r.level, r.feesPerYearINR ? t("feesValue", { amount: inr.format(r.feesPerYearINR) }) : null].filter(Boolean).join(" · "),
        run: link(`/programmes/${r.slug}`),
      }));
    }

    return [
      { title: t("programmes"), items: programmes },
      { title: t("pages"), items: pages.filter(hit).slice(0, MAX_PAGES) },
      { title: t("actions"), items: actions.filter(hit) },
    ].filter((g) => g.items.length);
  }, [query, index, nav, locale, pathname, router, onClose, t]);

  const items = groups.flatMap((g) => g.items);
  const current = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [current, items.length]);

  const optionId = (i: number) => `${id}-o${i}`;
  let position = -1;

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("title")}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === dialogRef.current) onClose();
      }}
      className="palette mx-auto mt-3 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-line bg-bg p-0 text-fg shadow-2xl backdrop:bg-ink/70 sm:mt-[12vh]"
    >
      <div className="flex max-h-[inherit] flex-col sm:max-h-[70vh]">
        <div className="flex items-center gap-2 border-b border-line-subtle pr-2">
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={items.length ? optionId(current) : undefined}
            aria-autocomplete="list"
            aria-label={t("inputLabel")}
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={t("placeholder")}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (items.length) setActive((current + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[current]?.run();
              }
            }}
            className="h-14 min-w-0 flex-1 bg-transparent pl-5 text-lg text-fg outline-none placeholder:text-fg-muted"
          />
          <button type="button" onClick={onClose} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm hover:bg-line-subtle">
            {t("close")}
          </button>
        </div>

        <p role="status" className="sr-only">
          {query.trim() ? t("results", { count: items.length }) : ""}
        </p>

        <div ref={listRef} id={`${id}-list`} role="listbox" aria-label={t("inputLabel")} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.title} role="group" aria-labelledby={`${id}-${group.title}`}>
              <div id={`${id}-${group.title}`} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                {group.title}
              </div>
              {group.items.map((item) => {
                position += 1;
                const i = position;
                return (
                  <div
                    key={item.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === current}
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                    className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-xl border-l-4 px-3 py-1.5 ${
                      i === current ? "border-l-link bg-line-subtle" : "border-l-transparent"
                    }`}
                  >
                    <span className="leading-snug font-medium">{item.label}</span>
                    {item.detail ? <span className="text-sm text-fg-muted">{item.detail}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && query.trim() ? (
            <p className="p-4">
              {t("none")}{" "}
              <a href={`tel:${nav.call.tel}`} className="font-semibold whitespace-nowrap">
                {nav.call.display}
              </a>
            </p>
          ) : null}
        </div>

        <p aria-hidden="true" className="hidden border-t border-line-subtle px-5 py-2 text-xs text-fg-muted sm:block">
          {t("hint")}
        </p>
      </div>
    </dialog>
  );
}
