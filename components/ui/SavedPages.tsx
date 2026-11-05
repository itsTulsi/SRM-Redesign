"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** The pages this device has saved, read straight from the service worker's cache (with each page's own title). */
export function SavedPages() {
  const t = useTranslations("Offline");
  const [pages, setPages] = useState<{ href: string; title: string }[] | null>(null);

  useEffect(() => {
    if (!("caches" in window)) return setPages([]);
    caches
      .keys()
      // Whatever version public/sw.js is on: its pages cache is the one named srm-<version>-pages.
      .then((names) => caches.open(names.find((n) => /^srm-.+-pages$/.test(n)) ?? "srm-pages"))
      .then(async (cache) => {
        const keys = await cache.keys();
        const list = await Promise.all(
          keys.map(async (req) => {
            const url = new URL(req.url);
            if (url.pathname.endsWith("/offline")) return null;
            const html = (await (await cache.match(req))?.text()) ?? "";
            const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/&amp;/g, "&").replace(/ — SRMIST$/, "") ?? url.pathname;
            return { href: url.pathname, title };
          }),
        );
        setPages(list.filter((p): p is { href: string; title: string } => !!p));
      })
      .catch(() => setPages([]));
  }, []);

  if (pages === null) return null;
  if (!pages.length) return <p className="text-fg-muted">{t("savedNone")}</p>;
  return (
    <ul className="flex flex-col border-t border-line-subtle">
      {pages.map((p) => (
        <li key={p.href}>
          {/* A plain link: offline, a full page load is what lets the service worker serve the saved copy. */}
          <a href={p.href} className="flex min-h-12 items-center border-b border-line-subtle py-2 font-semibold">
            {p.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
