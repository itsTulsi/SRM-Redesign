/*
 * SRMIST service worker: the important pages keep working with no connection. Hand-written, no library.
 *
 *   Page navigations           network first (3 s), then the saved copy, then a redirect to /<locale>/offline
 *   /_next/static/*            cache first (file names are hashed, so they never change)
 *   images, /media, /map, …    stale-while-revalidate, at most 80 files (oldest dropped)
 *   /api/search-index/*        stale-while-revalidate, so hero search works offline
 *   other /api/*, any POST     never touched: the page says plainly when it's offline
 *   other sites                never touched
 *
 * To ship changes, bump VERSION: the next visit installs the new worker and deletes every older srm-* cache.
 * Kill switch (see README): deploy a sw.js that unregisters itself and deletes all srm-* caches.
 */
const VERSION = "v2";
const PAGES = `srm-${VERSION}-pages`;
const STATIC = `srm-${VERSION}-static`;
const MEDIA = `srm-${VERSION}-media`;
const DATA = `srm-${VERSION}-data`;
const CURRENT = [PAGES, STATIC, MEDIA, DATA];
const MEDIA_LIMIT = 80;
const NETWORK_TIMEOUT = 3000;

const PRECACHE = ["/", "/ta", "/hi", "/offline", "/ta/offline", "/hi/offline", "/programmes", "/admissions", "/hostels"];

// The scripts and styles a saved page needs. Without them its HTML would show offline but fail to start.
const assetsIn = (html) => [...new Set([...html.matchAll(/["'](\/_next\/static\/[^"'\s]+)["']/g)].map((m) => m[1]))];

async function keepAll(cacheName, urls) {
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok || response.redirected) throw new Error(String(response.status));
      await cache.put(url, response);
    }),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      // One page failing to download must not stop the worker installing.
      await Promise.allSettled(PRECACHE.map((url) => pages.add(new Request(url, { cache: "reload" }))));
      const assets = new Set();
      for (const request of await pages.keys()) for (const url of assetsIn(await (await pages.match(request)).text())) assets.add(url);
      await keepAll(STATIC, [...assets]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("srm-") && !CURRENT.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const offlinePage = (pathname) => (/^\/ta(\/|$)/.test(pathname) ? "/ta/offline" : /^\/hi(\/|$)/.test(pathname) ? "/hi/offline" : "/offline");

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Oldest first: keys() returns entries in insertion order.
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT)),
    ]);
    if (response.ok && !response.redirected) cache.put(request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const saved = (await cache.match(request, { ignoreSearch: true })) || (await cache.match(url.pathname));
    if (saved) return saved;
    // Not saved: go to the offline page, so the address matches what's shown.
    const fallback = offlinePage(url.pathname);
    if (url.pathname !== fallback && (await cache.match(fallback))) return Response.redirect(new URL(fallback, url.origin).href, 302);
    return new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        if (limit) trim(cacheName, limit);
      }
      return response;
    })
    .catch(() => undefined);
  return hit || (await update) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") return event.respondWith(networkFirst(request));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  if (/^\/(_next\/image|media\/|map\/|brand\/|icons\/)/.test(url.pathname)) return event.respondWith(staleWhileRevalidate(request, MEDIA, MEDIA_LIMIT));
  if (url.pathname.startsWith("/api/search-index/")) return event.respondWith(staleWhileRevalidate(request, DATA));
  // Everything else (other APIs, Next's page data for client-side navigation) goes to the network as usual.
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const assets = (data.assets || []).filter((u) => typeof u === "string");
  const statics = assets.filter((u) => new URL(u, self.location.origin).pathname.startsWith("/_next/static/"));
  const index = assets.filter((u) => new URL(u, self.location.origin).pathname.startsWith("/api/search-index/"));

  // Files the page loaded before this worker was in charge, so they would otherwise never be cached.
  if (data.type === "warm") event.waitUntil(Promise.all([keepAll(STATIC, statics), keepAll(DATA, index)]));

  // "Save for offline": the page, its images, its scripts, and a few key pages.
  if (data.type === "save" && Array.isArray(data.pages)) {
    event.waitUntil(
      (async () => {
        const pages = await caches.open(PAGES);
        let saved = 0;
        for (const url of data.pages) {
          try {
            const response = await fetch(url, { credentials: "same-origin" });
            if (!response.ok || response.redirected) continue;
            const html = await response.clone().text();
            await pages.put(url, response);
            await keepAll(STATIC, assetsIn(html));
            saved++;
          } catch {
            // Offline or failed: count only what was actually saved.
          }
        }
        const media = await keepAll(MEDIA, (data.media || []).slice(0, 40));
        await Promise.all([keepAll(STATIC, statics), keepAll(DATA, index)]);
        if (port) port.postMessage({ ok: saved > 0, pages: saved, media });
      })().catch(() => port && port.postMessage({ ok: false })),
    );
  }
});
