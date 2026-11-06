// node scripts/check-links.mjs [base] [--ext]: crawls every page from the sitemap, checks status codes, #anchors and (with --ext) external links.
const BASE = process.argv[2] ?? "http://localhost:3123";
const seen = new Map(); // path -> {status, ids:Set, links:[]}
const queue = [];
const externals = new Map(); // url -> [from pages]
const add = (p) => { if (!seen.has(p) && !queue.includes(p)) queue.push(p); };

const sm = await (await fetch(BASE + "/sitemap.xml")).text();
for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) add(new URL(m[1]).pathname);
["/en", "/ta", "/hi"].forEach(add);

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const problems = [];
while (queue.length) {
  const path = queue.shift();
  let res;
  try { res = await fetch(BASE + path, { redirect: "follow" }); } catch { seen.set(path, { status: "ERR" }); problems.push(`ERR ${path}`); continue; }
  const ct = res.headers.get("content-type") ?? "";
  const entry = { status: res.status, ids: new Set(), links: [] };
  seen.set(path, entry);
  if (res.status >= 400) continue;
  if (!ct.includes("html")) continue;
  const html = await res.text();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) entry.ids.add(m[1]);
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    const href = decode(m[1]);
    entry.links.push(href);
    if (!href || href === "#") { problems.push(`EMPTY-HREF on ${path}: "${href}"`); continue; }
    if (/^(mailto|tel|javascript):/.test(href)) continue;
    const u = new URL(href, BASE + path);
    if (u.origin !== new URL(BASE).origin) { const k = u.href; externals.set(k, [...(externals.get(k) ?? []), path]); continue; }
    if (/\.(jpg|jpeg|png|webp|pdf|svg|xml|txt|json|mp4)$/i.test(u.pathname)) { add(u.pathname); continue; }
    add(u.pathname);
  }
}
// anchors
const anchorProblems = new Set();
for (const [path, e] of seen) {
  for (const href of e.links ?? []) {
    if (!href.includes("#")) continue;
    const u = new URL(href, BASE + path);
    if (u.origin !== new URL(BASE).origin || !u.hash || u.hash === "#") continue;
    let target = seen.get(u.pathname);
    if (!target) continue;
    if (target.status >= 300 && target.status < 400) continue;
    const id = decodeURIComponent(u.hash.slice(1));
    if (!target.ids?.has(id)) anchorProblems.add(`MISSING-ANCHOR ${u.pathname}#${id}  (linked from ${path})`);
  }
}
const bad = [...seen].filter(([, e]) => typeof e.status !== "number" || e.status >= 400);
console.log(`Pages crawled: ${seen.size}`);
console.log(`Broken internal (${bad.length}):`);
for (const [p, e] of bad) {
  const from = [...seen].filter(([, x]) => x.links?.some((h) => { try { return new URL(h, BASE + "/x").pathname === p; } catch { return false; } })).map(([q]) => q).slice(0, 3);
  console.log(`  ${e.status} ${p}  <- ${from.join(", ")}`);
}
console.log(`Anchor problems (${anchorProblems.size}):`);
[...anchorProblems].slice(0, 80).forEach((x) => console.log("  " + x));
console.log(`Other (${problems.length}):`); [...new Set(problems)].slice(0, 40).forEach((x) => console.log("  " + x));
// externals
console.log(`External links: ${externals.size}`);
if (process.argv.includes("--ext")) {
  const results = await Promise.all([...externals.keys()].map(async (url) => {
    try {
      const ctl = AbortSignal.timeout(15000);
      let r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctl, headers: { "user-agent": "srm-redesign-linkcheck" } });
      if (r.status === 405 || r.status === 403 || r.status === 404) r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "srm-redesign-linkcheck" } });
      return [url, r.status];
    } catch (e) { return [url, "ERR " + (e.cause?.code ?? e.name)]; }
  }));
  for (const [url, s] of results) if (s !== 200) console.log(`  EXT ${s} ${url}  <- ${externals.get(url).slice(0, 2).join(", ")}`);
}
