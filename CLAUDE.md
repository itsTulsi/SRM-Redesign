# CLAUDE.md — Next-Gen SRM Website (Design Challenge Entry)

You are building a competition-winning redesign of **srmist.edu.in** (SRM Institute of Science and Technology, Kattankulathur, Chennai) for the *Next-Gen SRM Website Design Challenge* (prize ₹1,00,000, judged by SRM). The goal: a site that makes judges say "this belongs on Awwwards" **and** "a parent on a ₹8,000 Android can find B.Tech CSE fees in 3 taps."

Bold is the brief. Slow, inaccessible or confusing is disqualifying. Every wow-effect must have a fast, accessible fallback.

---

## 1. The concept: "Learn. Leap. Lead." as a three-act scroll

SRM's real tagline is *Learn. Leap. Lead.* We turn it into the **structure** of the homepage. Each word is one act of the scroll. A living tree (from SRM's emblem) grows as you scroll and doubles as the progress indicator.

Homepage, top to bottom (nothing else goes on the homepage):

1. **Hero — "What do you want to become?"**
   Full-bleed muted campus video (poster image first), one giant input. Typing returns 3 matching programmes across colleges/campuses (AI matcher, §6). Under the input: audience chips → Students · Parents · International · Research · Alumni. The tree seed sits at the bottom of the viewport.
2. **Act I — LEARN.** Colleges as a horizontal hover/drag strip. Hover (tap on mobile) a college → real photo floods in + one outcome number. Rankings as live text, current year only.
3. **Act II — LEAP.** Student work, full-screen and cinematic. Pinned scroll scene for Team Camber Racing (3D car or video), then Swift Student Challenge winner, then a startup. Then research by *mission* (Health · Mobility · Space & Materials · Sustainability), not a stats wall.
4. **Act III — LEAD.** Three alumni as people (face, one line, career path), then placement numbers count up.
5. **Explore — campus constellation map.** Stylised map of Tamil Nadu + Delhi NCR with 6 campus pins + 3 sister universities. Click a pin → camera flies in → opens that campus's 360° tour.
6. **This week at SRM.** One curated story (Harvard model) + compact events rail.
7. **Footer.** Grouped, collapsible on mobile. All statutory links (NAAC, UGC, AICTE, RTI, NIRF, IQAC, Anti-Ragging, Grievance) kept — just off the main flow.

---

## 2. What we take from which university

Use this as the design brief. Each idea must be visibly present in the build; mention the source in the pitch deck, not on the site.

| Steal from | URL | What exactly | Where it lands in our build |
|---|---|---|---|
| Harvard | harvard.edu | Homepage built around one curated, rotating topic; complexity revealed only on demand | §1.6 "This week at SRM"; mega-menu progressive disclosure |
| Stanford | stanford.edu | Sparse homepage, search as the primary navigation | §1.1 hero input is the main door |
| Imperial College London | imperial.ac.uk | Bold accent block ("find a course") peeking above the fold to pull the scroll | Accent-coloured programme results peek at hero bottom |
| RISD | risd.edu | Custom type treatment that moves from "incomplete" to "complete"; colours with meaning; layered animated text + image | Display headings assemble on scroll (§5); colour tokens with meaning (§4) |
| VCU School of the Arts (2025 Webby) | arts.vcu.edu | Colour strip that shifts on scroll; hover-reveal images on department list | Act I college strip hover-reveal; act colour shifts |
| Ravensbourne University London | ravensbourne.ac.uk | Logo motif becomes animation + custom cursor; dark mode; 3D campus tours in-page | The growing tree motif + tree-node cursor; dark theme; in-page 360° |
| SOAS University of London | soas.ac.uk | Moving globe on homepage; question-led copy; heavy motion yet WCAG 2.2 AA | Campus constellation map; question-led headings; accessibility bar we must meet |
| University of Austin (UATX) | uaustin.org | Single-scroll manifesto, few nav links, no stock photos | The three-act scroll; 5 top-level nav items max |
| Guildhall School | gsmd.ac.uk | Content revealed step by step like a theatre curtain | Act transitions = curtain/mask reveals |
| University of Essex | essex.ac.uk | Gradients, autoplay video, confident voice ("We are Essex. Are you?") | Copy voice: "Leap with us." / "Where will you lead?" |
| University of Hull | hull.ac.uk | Signature button hover micro-interactions; room to breathe | Magnetic buttons with tree-leaf ripple |
| University of Toronto | utoronto.ca | Multi-campus under one identity; dedicated international entry | Campus constellation; International audience chip |
| University of Melbourne | unimelb.edu.au | Research by impact theme, not by faculty | Act II research missions |
| York St John University | yorksj.ac.uk | Search with suggested journeys as prompts | Hero input shows rotating example prompts |
| University of Sydney "Here" | (Awwwards SOTD) | 360° interactive tour; doubled traffic | 360° tour opened from the map, inside the page |
| OCAD U Admissions | admissions.ocadu.ca | Bold redesign → +21% visits, +15% applicants | Pitch evidence that bold converts |
| Cornell Human Ecology (2026 Webby) | human.cornell.edu | Many programmes as one navigable system | Unified programme finder across all colleges |

**Our original additions no university does (the "win" features):**
- **AI programme matcher with citations** in English, Tamil and Hindi (§6).
- **"Ask a Senior"** — verified current students answer applicant questions on each programme page (mock the data, build the UI + moderation states).
- **Parent Mode** toggle — rewrites the page into plain answers: fees, safety, hostel, placements, distance from Chennai, with a "Call admissions" button.
- **Lite Mode** — auto-enabled on `Save-Data`, slow `navigator.connection`, or `prefers-reduced-motion`; strips video/3D, keeps everything usable.

---

## 3. Tech stack (do not deviate without asking)

- **Next.js 15 (App Router) + TypeScript (strict)**
- **Tailwind CSS v4** with CSS variables for tokens
- **GSAP + ScrollTrigger** for scroll choreography; **Lenis** for smooth scroll (disabled in Lite Mode / reduced motion)
- **React Three Fiber + drei** for the Camber car scene and campus map — dynamically imported, client-only, never in the initial bundle
- **next-intl** for `en`, `ta`, `hi`
- **Fuse.js** for instant client-side programme search; `/api/ask` route for the AI matcher (§6)
- **next/font** for fonts (self-hosted), **next/image** for every image
- Deploy target: **Vercel**

```
app/
  [locale]/
    page.tsx                # homepage (three acts)
    programmes/page.tsx     # full finder with filters
    programmes/[slug]/page.tsx  # programme page + Ask a Senior
    campuses/[slug]/page.tsx
    stories/[slug]/page.tsx
    admissions/page.tsx
  api/ask/route.ts          # AI matcher (retrieval-only)
components/
  hero/ acts/ tree/ map/ nav/ finder/ ui/
content/
  programmes.json  campuses.json  stories.json  alumni.json  stats.json
lib/
  motion.ts  lite-mode.ts  search.ts  i18n.ts
messages/ en.json ta.json hi.json
public/media/               # user-supplied photos/video go here
```

---

## 4. Design system

**Colour tokens** (each has a meaning — RISD rule):
- `--srm-blue-900: #0B1B4D` — the institution, trust (primary background in dark theme)
- `--srm-blue-500: #1F4FD8` — links, focus
- `--leap-lime: #C6F432` — **action only** (Apply, primary CTAs, Imperial-style peek block). Never decorative.
- `--leaf-green: #2E8B57` — the tree, growth, progress
- `--paper: #F5F3EE` — light theme background (canvas)
- `--ink: #0E0E10` — text
- Every text/background pair must pass WCAG 2.2 AA (4.5:1 body, 3:1 large). Check lime on blue and lime on paper; use ink text on lime.

**Type:**
- Display: a bold grotesk/condensed face (e.g. *Clash Display* or *Space Grotesk* via self-host) — huge, tight leading, set in clamp() sizes up to ~14vw for act titles.
- Text: *Inter* — 17px base on mobile, 1.6 line-height.
- Tamil: *Noto Sans Tamil*; Hindi: *Noto Sans Devanagari*. Never fake-bold these.

**Layout:** 12-col grid desktop, 4-col mobile, 16px gutters on mobile, no horizontal scroll ever. Generous whitespace — one idea per screen.

**Themes:** dark only, site-wide. Light mode was removed at the team's request (2026-10-25) — no theme toggle, no `prefers-color-scheme` switching.

---

## 5. Motion spec (the "crazy" part — with rules)

- **The Living Tree** (signature, everywhere): an original procedurally drawn SVG tree (do not trace the official emblem). Branches draw in with `stroke-dashoffset` tied to scroll progress across the three acts. Act I grows roots, Act II the trunk + branches, Act III leaves/canopy. Fixed bottom-left on desktop as scroll progress; thin progress bar on mobile.
- **Cursor:** desktop only — small leaf-node dot that grows into a ring over interactive elements, shows "Drag" on the college strip, "Explore" on map pins.
- **Act titles:** LEARN / LEAP / LEAD set at ~14vw, letters assemble from scattered fragments (RISD "incomplete → complete"), then pin while content scrolls beneath.
- **Act transitions:** curtain/mask wipes in the act colour (Guildhall).
- **Camber Racing scene:** pinned section; car rotates with scroll (R3F, low-poly GLB under 2 MB, or a scroll-scrubbed image sequence fallback); stats appear as callouts on the car.
- **Counters:** count up on enter **from the real final value rendered in HTML** (SSR the real number, animate only as enhancement — never show 0 without JS).
- **Magnetic buttons** with a leaf ripple on press (Hull).
- **Campus map:** stylised low-poly/dot map; pins pulse; click = camera fly-to then 360° tour in a modal.

**Rules:**
- Animate only `transform` and `opacity`. No layout thrash.
- All motion off under `prefers-reduced-motion: reduce` → instant states, no Lenis, no pinning, tree shown fully grown.
- 3D and video load only when the section is near the viewport (IntersectionObserver) and never in Lite Mode.
- Nothing auto-plays with sound. No auto-rotating carousels anywhere (deliberate choice — users never see past slide 1).

---

## 6. AI programme matcher (`/api/ask`)

- Input: free text in en/ta/hi ("I like robots and want to work abroad").
- Step 1 (instant, client): Fuse.js over `programmes.json` → show top 3 as you type.
- Step 2 (on submit): `/api/ask` does **retrieval-only** answering — select candidate programmes from `programmes.json`, then (if `ANTHROPIC_API_KEY` is set) ask Claude to explain the match in 2 sentences using only the retrieved records. Each answer card shows the source fields (fees, eligibility, deadline) **from the JSON, not from the model**.
- If retrieval confidence is low → say "I'm not sure — here's admissions" with phone numbers. Never invent fees, dates or eligibility.
- No API key → graceful fallback to Fuse results only. The demo must work offline.
- Response payload under 10 KB; works on 3G.

---

## 7. Content — use only these verified facts

Do not invent statistics. Anything not listed here → `TODO:` placeholder that is visible in dev.

- Name: SRM Institute of Science and Technology (SRMIST), Kattankulathur, Chennai. Tagline: **Learn. Leap. Lead.**
- NIRF 2024 (from current site): University 12 · Engineering 13 · Overall 21 · Dental 7 · Architecture 11 · Pharmacy 11 · Medical 18 · Research 24. *(Site also shows 2025 NIRF images — TODO: transcribe 2025 values and prefer them.)*
- NAAC **A++**.
- Placements 2023–24: 980+ companies · 5,546+ offers · 2,232+ high-paying offers · highest CTC 52 LPA · average CTC 7.19 LPA.
- Research: 920+ patents · 47,000+ publications · 33,000+ Scopus-indexed · ₹250+ crore externally funded projects.
- **Team Camber Racing** — National Champions, Formula Bharat 2026 (combustion category); first in Endurance, Skidpad, Autocross, Acceleration, Engineering Design, Fuel Economy, Sustainability & Best Practices; Best Driver Award. Captain Himanshu Kumar (ECE, final year); chief race driver M. Sakthiprasad (Automobile Engg.). Multidisciplinary: mechanical, electrical, electronics, computing.
- SRMIST student named Distinguished Winner, Apple Swift Student Challenge 2026.
- SRMIST × Volvo Group: Volvo's first university-based Vehicle Technology Centre.
- Notable alumni (public on srmist.edu.in): Sriram Krishnan (Senior Policy Advisor for AI, The White House); Varun Chakravarthy (Indian cricketer); Ojas Mahapatra (Group CEO, MARS Bioimaging).
- Campuses: Kattankulathur (Chennai) · Ramapuram (Chennai) · Vadapalani (Chennai) · Tiruchirappalli · Delhi NCR · Baburayanpettai (Chengalpattu). Sister universities: SRM AP, SRM Haryana, SRM Sikkim.
- Admissions phones: +91 70 2645 2645 (Engineering, Agriculture, Architecture) · +91 70 2647 2647 (other colleges) · Main +91-44-27417000.
- Existing 360° tour: https://webstor.srmist.edu.in/web_assets/srmist-virtual-tour-vo/index.htm

`programmes.json`: seed ~25 real programmes across Engineering, Medicine, Dental, Law, Management, Architecture, Science & Humanities, Agriculture, Pharmacy, Nursing. Fields: `slug, name, college, campus, level, durationYears, eligibility, feesPerYearINR (TODO if unknown), deadline (TODO), tags[], outcomes`.

**Media:** use real SRM photos/video placed in `public/media/` by the team. Until then use neutral gradient placeholders with a visible "PHOTO TODO" label — never stock photos of other campuses.

---

## 8. Non-negotiable quality bars

- **Performance (mid-range Android, 4G throttled):** LCP < 2.5 s, CLS < 0.05, INP < 200 ms. Initial JS < 180 KB gzipped (3D, GSAP plugins and video are lazy). Lighthouse mobile ≥ 90 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.
- **Accessibility:** WCAG 2.2 AA. Full keyboard path through every act, visible focus rings, skip link, landmarks, alt text, captions on video, `lang` set per locale. No accessibility toolbar plugin — it's built in.
- **SEO/AI-readable:** every number is real text in SSR HTML; JSON-LD `CollegeOrUniversity`, `EducationalOccupationalProgram`, `Event`; sitemap + per-locale hreflang.
- **Mobile first:** design and test at 360 × 800 before desktop. Tap targets ≥ 44 px.
- **Lite Mode** must give the same information with zero video/3D/smooth-scroll.

---

## 9. Build order (commit after each, keep the site runnable)

1. Scaffold Next.js + Tailwind tokens + fonts + i18n + Lite Mode detection.
2. Content JSON files with verified data (§7) and TODOs.
3. Nav (5 items: Study · Research · Student Work · Campuses · About + Apply button) + footer with all statutory links.
4. Hero + Fuse search + audience chips. Ship this working before any animation.
5. Acts I–III static layouts, fully responsive and accessible.
6. Living Tree SVG + scroll progress.
7. GSAP choreography: act titles, curtain transitions, counters, hover reveals.
8. Camber Racing pinned scene (image-sequence first, R3F upgrade if time).
9. Campus constellation map + 360° modal.
10. `/api/ask` AI matcher with fallback.
11. Programme page with Ask a Senior (mock data) + Parent Mode.
12. Tamil + Hindi translations for homepage and programme pages.
13. Audit: Lighthouse, axe, keyboard-only run, reduced-motion run, Lite Mode run, 360 px run. Fix everything below §8 bars.

---

## 10. Working rules for Claude Code

- Ask before adding any dependency not in §3.
- Never fabricate SRM facts, people, fees or dates — use `TODO:`.
- Every new section: build static + accessible first, then layer motion.
- Run `npm run build` and `npm run lint` before declaring a step done.
- Keep a `DEMO.md` updated with the 60-second judge walkthrough: hero search "robotics" → Act II Camber scene → map → Kattankulathur 360° → toggle Tamil → toggle Parent Mode → Lighthouse score screenshot.
