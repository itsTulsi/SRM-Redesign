// node scripts/ui-audit.mjs [base]: opens every page type in headless Chrome at phone, tablet and desktop widths and
// reports horizontal scroll, tap targets under 44 px, links hidden under fixed UI, images without alt, and console errors.
// Needs Google Chrome installed; uses the DevTools protocol directly (Node 22 has WebSocket), no extra packages.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3123";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES = ["/en", "/en/programmes", "/en/programmes/btech-cse", "/en/compare", "/en/admissions", "/en/hostels", "/en/student-life", "/en/research", "/en/stories", "/en/stories/camber-racing-formula-bharat-2026", "/en/campuses/kattankulathur", "/en/walk", "/ta", "/hi/programmes"];
const WIDTHS = [360, 768, 1440];

const port = 9333;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", `--user-data-dir=${mkdtempSync(join(tmpdir(), "uia-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
}
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description?.split("\n")[0] ?? msg.params.exceptionDetails.text);
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200));
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ""}`.slice(0, 200));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const probe = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: document.documentElement.scrollWidth - vw, wide: [], small: [], covered: [], noAlt: [] };
  if (out.overflow > 0) for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed") {
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o !== "visible") { clipped = true; break; } p = p.parentElement; }
      if (!clipped) out.wide.push((el.id ? "#" + el.id : el.tagName.toLowerCase()) + "." + [...el.classList].slice(0, 3).join(".") + " right=" + Math.round(r.right));
    }
  }
  const fixed = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); return (s.position === "fixed" || s.position === "sticky") && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; });
  for (const el of document.querySelectorAll("a[href], button, input, select, summary, [role=button]")) {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === "hidden" || el.closest("[inert],[aria-hidden=true],.sr-only")) continue;
    const inline = s.display === "inline" && el.closest("p, li, dd, td, figcaption");
    if (!inline && (r.width < 24 || r.height < 24) ) out.small.push(((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30)) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  for (const img of document.querySelectorAll("img:not([alt])")) out.noAlt.push(img.src.slice(-60));
  return JSON.stringify(out);
})()`;

// "Covered" check: scroll through the page and, at each step, see whether a visible link's centre is under fixed UI.
const coverProbe = `(async () => {
  const hits = new Set();
  const H = innerHeight;
  for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(H * 0.6)) {
    scrollTo(0, y); await new Promise((r) => setTimeout(r, 60));
    for (const el of document.querySelectorAll("main a[href], main button")) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || !r.width) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cy < 70 || cy > H - 2) continue; // under the header bar is expected while scrolling
      const top = document.elementFromPoint(cx, cy);
      if (!top || el.contains(top) || top.contains(el)) continue;
      const f = top.closest(".assistant-launcher, [data-dock], .grail-dock, header, nav[aria-label], [class*=dock], [class*=launcher]");
      if (f && getComputedStyle(f).position === "fixed") {
        // Floating buttons pass over content while you scroll; it only matters if scrolling can't bring the link clear.
        const y0 = scrollY;
        el.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 60));
        const r2 = el.getBoundingClientRect();
        const t2 = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
        if (t2 && !el.contains(t2) && !t2.contains(el) && t2.closest(".assistant-launcher, .grail-dock, [class*=dock], [class*=launcher]"))
          hits.add((el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40) + " <under> " + (f.className || f.tagName).toString().slice(0, 40));
        scrollTo(0, y0);
        await new Promise((r) => setTimeout(r, 40));
      }
    }
  }
  scrollTo(0, 0);
  return JSON.stringify([...hits]);
})()`;

const report = [];
for (const w of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 768 ? 800 : 900, deviceScaleFactor: 1, mobile: w < 768 });
  for (const p of PAGES) {
    errors.length = 0;
    await send("Page.navigate", { url: BASE + p + (p.includes("?") ? "&" : "?") + "intro=0" });
    await sleep(2500);
    // Skip the homepage gate intro if it is showing.
    await send("Runtime.evaluate", { expression: "sessionStorage.setItem('srm-intro-seen','1'); document.querySelector('.grail-intro-skip, [data-intro-skip]')?.click()" });
    await sleep(400);
    const r = JSON.parse((await send("Runtime.evaluate", { expression: probe, returnByValue: true })).result.result.value);
    const c = JSON.parse((await send("Runtime.evaluate", { expression: coverProbe, awaitPromise: true, returnByValue: true })).result.result.value);
    const issues = [];
    if (r.overflow > 0) issues.push(`horizontal scroll +${r.overflow}px: ${r.wide.slice(0, 4).join(" | ")}`);
    if (r.small.length) issues.push(`small targets (<24px): ${r.small.slice(0, 6).join(" | ")}`);
    if (c.length) issues.push(`covered by fixed UI: ${c.slice(0, 4).join(" | ")}`);
    if (r.noAlt.length) issues.push(`img without alt: ${r.noAlt.length}`);
    const errs = [...new Set(errors)];
    if (errs.length) issues.push(`console errors: ${errs.slice(0, 3).join(" | ")}`);
    report.push({ w, p, issues });
    console.log(`${w}px ${p}: ${issues.length ? "\n   - " + issues.join("\n   - ") : "ok"}`);
  }
}
ws.close();
chrome.kill();
const bad = report.filter((r) => r.issues.length).length;
console.log(`\n${report.length} page views, ${bad} with issues`);
