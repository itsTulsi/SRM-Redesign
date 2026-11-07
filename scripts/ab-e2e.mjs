// node scripts/ab-e2e.mjs [base] [sessions]: checks the A/B pipeline end to end in headless Chrome. Each session is a fresh,
// isolated browser context (like a new visitor): it checks a variant was assigned, that only that variant is visible, that
// the view was counted, and (in every other session) clicks the goal and checks it was counted. It also checks ?ab= forcing.
// This verifies the machinery; it is not user research (the clicks are scripted, so its conversion rates mean nothing).
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3123";
const N = Number(process.argv[3] ?? 40);
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9555;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "ab-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 40 && !ver; i++) { await sleep(250); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch {} }
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (m) => { const x = JSON.parse(m.data); if (x.id && pend.has(x.id)) { pend.get(x.id)(x); pend.delete(x.id); } });
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
const evalIn = async (sid, expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sid)).result?.result?.value;

const counts = async () => Object.fromEntries((await (await fetch(BASE + "/api/ab")).json()).map((r) => [r.id, r]));
const before = await counts();

const visit = async (url, act) => {
  const { result: ctx } = await send("Target.createBrowserContext");
  const { result: tgt } = await send("Target.createTarget", { url: "about:blank", browserContextId: ctx.browserContextId });
  const { result: att } = await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true });
  const sid = att.sessionId;
  await send("Page.enable", {}, sid);
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "try{sessionStorage.setItem('srm-intro-seen','1')}catch(e){}" }, sid);
  await send("Page.navigate", { url }, sid);
  await sleep(2200);
  const out = await act(sid);
  await sleep(300);
  await send("Target.disposeBrowserContext", { browserContextId: ctx.browserContextId });
  return out;
};

const problems = [];
let assigned = { a: 0, b: 0 }, clicked = { a: 0, b: 0 };
for (let i = 0; i < N; i++) {
  const r = await visit(BASE + "/", async (sid) => {
    const v = await evalIn(sid, "document.documentElement.getAttribute('data-ab-hero-cta')");
    const shown = await evalIn(sid, "[...document.querySelectorAll('[data-ab=hero-cta]')].filter(e=>e.getClientRects().length).map(e=>e.dataset.abVariant).join(',')");
    let click = false;
    if (i % 2 === 0) {
      click = await evalIn(sid, "(()=>{const el=[...document.querySelectorAll('[data-ab=hero-cta]')].find(e=>e.getClientRects().length); const a=el&&el.querySelector('a[href]'); if(!a) return false; a.addEventListener('click',ev=>ev.preventDefault(),{once:true}); a.click(); return true})()");
    }
    return { v, shown, click };
  });
  if (r.v !== "a" && r.v !== "b") problems.push(`session ${i}: no variant assigned (${r.v})`);
  else assigned[r.v]++;
  if (r.shown !== r.v) problems.push(`session ${i}: assigned ${r.v} but visible ${r.shown || "none"}`);
  if (r.click) clicked[r.v]++;
}
// Forcing with ?ab= works and sticks.
const forced = await visit(BASE + "/programmes/btech-cse?ab=programme-cta:b", async (sid) => ({
  v: await evalIn(sid, "document.documentElement.getAttribute('data-ab-programme-cta')"),
  shown: await evalIn(sid, "[...document.querySelectorAll('[data-ab=programme-cta]')].filter(e=>e.getClientRects().length).map(e=>e.dataset.abVariant).join(',')"),
}));
if (forced.v !== "b" || !/^b(,b)*$/.test(forced.shown)) problems.push(`?ab= forcing failed: ${JSON.stringify(forced)}`);

await sleep(800);
const after = await counts();
const d = (e, v, k) => after[e][v][k] - before[e][v][k];
const views = { a: d("hero-cta", "a", "views"), b: d("hero-cta", "b", "views") };
const goals = { a: d("hero-cta", "a", "goals"), b: d("hero-cta", "b", "goals") };
if (views.a !== assigned.a || views.b !== assigned.b) problems.push(`views counted ${JSON.stringify(views)} but sessions ${JSON.stringify(assigned)}`);
if (goals.a !== clicked.a || goals.b !== clicked.b) problems.push(`goals counted ${JSON.stringify(goals)} but clicks ${JSON.stringify(clicked)}`);
if (d("programme-cta", "b", "views") < 1) problems.push("programme-cta B view not counted");

console.log(`sessions: ${N}; split A ${assigned.a} / B ${assigned.b}; views counted A ${views.a} / B ${views.b}; goals counted A ${goals.a} / B ${goals.b} (clicked A ${clicked.a} / B ${clicked.b})`);
console.log(`forced ?ab=programme-cta:b -> ${forced.v}, visible ${forced.shown}`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "all checks passed");
ws.close(); chrome.kill();
process.exit(problems.length ? 1 : 0);
