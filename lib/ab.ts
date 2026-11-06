/**
 * A/B testing, built in and private: no third-party script, no cookies, no personal data. A visitor gets a random
 * variant per experiment, kept in localStorage; both variants are in the HTML, and the head script below marks <html>
 * before first paint, so pages stay static and nothing flickers. Elements opt in with data-ab / data-ab-variant
 * (CSS hides the other variant) and data-ab-goal (a click that counts as a conversion). Events go to /api/ab.
 *
 * Try a variant on purpose: ?ab=hero-cta:b (comma-separate several). Results: /lab.
 */
export const EXPERIMENTS = {
  "hero-cta": {
    variants: ["a", "b"],
    question: "Does a search-first hero get more visitors into a programme than the game-style 'Start your run' button?",
    a: "Start your run (apply) + Find a programme",
    b: "What do you want to become? search box + Start your run",
    goal: "Clicks or searches that leave the hero for the programme finder, a programme, or the application",
  },
  "programme-cta": {
    variants: ["a", "b"],
    question: "On a programme page, does showing 'What will it cost?' first lead to more enquiries and applications?",
    a: "Apply first, then Enquire, Call",
    b: "What will it cost? first, then Apply, Enquire, Call",
    goal: "Clicks on Apply or Enquire on the programme page",
  },
} as const satisfies Record<string, { variants: readonly string[]; question: string; a: string; b: string; goal: string }>;

export type ExperimentId = keyof typeof EXPERIMENTS;
export const AB_STORAGE_KEY = "srm-ab";

/** Serialised into the head script: assign (or read, or take from ?ab=) a variant per experiment and mark <html>. */
export function applyAb(key: string, exps: Record<string, readonly string[]>) {
  let saved: Record<string, string> = {};
  try {
    saved = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {}
  const force = new URLSearchParams(location.search).get("ab");
  if (force)
    force.split(",").forEach((pair) => {
      const [e, v] = pair.split(":");
      if (e && v && exps[e] && exps[e].indexOf(v) > -1) saved[e] = v;
    });
  for (const e in exps) {
    const list = exps[e]!;
    if (!saved[e] || list.indexOf(saved[e]) < 0) saved[e] = list[Math.floor(Math.random() * list.length)]!;
    document.documentElement.setAttribute("data-ab-" + e, saved[e]);
  }
  try {
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {}
}

export const experimentVariants = Object.fromEntries(Object.entries(EXPERIMENTS).map(([k, v]) => [k, v.variants])) as Record<string, readonly string[]>;
