# Task 5: Missing features, full implementation and final A/B testing

Measured on 6 November 2026 against the production build of this repository. Live preview:
https://srm-redesign-one.vercel.app (see "Deploy" at the end: the live site needs a redeploy to show this work).

## Summary

We checked every link on all 200 pages, fixed 1,764 links that pointed to sections that no longer existed, and added
the missing pages and sections they were meant to reach. We fixed the layout problems an automated check found at
phone, tablet and desktop widths, made the opening scroll faster, and added two new features: a full-course cost
calculator and built-in, private A/B testing with two experiments running. Lighthouse accessibility, best practices
and SEO stay at 100 on every page we measured.

## Step 1: every link checked and fixed

| Check | Before | After |
|---|---|---|
| Pages crawled (all languages, from the sitemap and every link) | 196 | 200 (includes the new Stories page in three languages) |
| Broken pages (4xx/5xx) | 0 | 0 |
| Links to an `#anchor` that does not exist on the target page | 1,764 | 0 |
| External links outside srmist.edu.in that fail | 0 | 0 |

**Cause:** the nav, footer and research page still linked to sections of an earlier homepage design (research
missions, research numbers, rankings, alumni, "This week at SRM", student work).

**Fix:** we put the content where the links point. There is a new **Stories** page (this week at SRM, all student
work, alumni with career paths), the research page has **Research by mission** (one anchor per mission) and
**Research in numbers**, and the homepage rankings chapter has its anchor again. All of these links now come from one
map (`lib/sections.ts`), so they cannot drift apart again.

**srmist.edu.in links (44):** SRM's site refuses automated checkers, and we did not try to get around that. These links
need one manual click-through by the team before submission.

Tool: `node scripts/check-links.mjs http://localhost:3123 --ext`

## Step 2: UI fixes across screen sizes

An automated UI audit (`scripts/ui-audit.mjs`) opens 13 page types in headless Chrome at 360, 768 and 1440 px and
checks for horizontal scroll, tap targets under 24 px, links hidden under floating UI, images without alt text and
console errors.

| Found | Fix |
|---|---|
| The floating "Start your run" button covered links (quests, clubs, campus names) on the homepage | It now steps aside whenever a link, button or field is under it |
| Learn. Leap. Lead. chapter: its three cards went under an empty black stretch before you could read them | The chapter scrolls normally; the next chapter's ink-blot reveal starts larger and earlier |
| The helix's pause button sat under the Leafy assistant button | Moved to the left |
| Enquiry consent checkbox was 21 px | 24 px |
| The opening (gate) scroll felt long | 1.2 screens of scrolling instead of 2 (`INTRO_SCREENS` in `IntroGate.tsx`) |

Result: 39 page views (13 pages × 3 widths), 0 issues.

## Step 3: missing features, built

### What was missing

| Gap | Where it hurt | Now |
|---|---|---|
| No single answer to "what will the whole course cost?" | Parents had to add tuition, hostel and mess from three different SRM pages and PDFs | **What will it cost?** on every programme page |
| Alumni, "This week at SRM" and student work had no page | Nav and footer links went nowhere | **Stories** page |
| Research missions and research numbers had no home | Links went nowhere | Research page chapters |
| Search could only start on the programmes page | Visitors with a goal ("robots") had to find the finder first | The finder accepts `?q=`; the homepage search-first variant uses it |

### What will it cost? (new)

Pick where you will live (at home, or an SRM hostel for boys or girls), then a room. The calculator shows the per-year
and whole-course cost with a breakdown (tuition, hostel, mess, optional laundry).
- It uses SRM's own published figures only: 2026–27 tuition for Kattankulathur and the 2026–27 hostel circulars.
- When SRM hasn't published a figure (MBBS tuition), it says so and gives the admissions number instead of guessing.
- Programmes at other campuses are pointed to admissions for hostels.
- It says plainly that the registration and exam fees are extra and that later years can change.
- It appears in both the student view and Parent Mode; Parent Mode's cost answer links to it.

Example: B.Tech CSE with a non-AC 6-sharing room (Senbagam) and laundry comes to ₹6,01,500 a year, ₹24,06,000 over
four years.

### Still missing (next)

- **Walk SRM**, a walkable 3D campus game at real buildings (plan awaiting approval: `docs/CAMPUS-WALK-PLAN.md`).
- Scholarships: SRM's scholarship rules are not yet in our data; the calculator points to admissions for now.
- Per-campus programme availability (engineering also runs at Ramapuram, Vadapalani, Delhi NCR and Tiruchirappalli):
  still a TODO in the data.

## Final A/B testing

### How it works

- A visitor gets variant A or B of each experiment at random, kept on their device (localStorage). There are no
  cookies and no personal data.
- Both variants are in the page. A tiny script in the page head picks the variant before anything is drawn, so pages
  stay static and fast, and nothing flickers.
- Views and goal clicks go to `/api/ab`, which validates them, rate-limits them and writes each one to the server log.
- `/lab` (not linked, not indexed) shows what each experiment tests, buttons to see either variant, and live results
  with a two-proportion z-test. A result is called only after 100 views per variant and p < 0.05.
- Anyone can see a variant on purpose with `?ab=hero-cta:b`.

### Experiments running

| Experiment | A | B | Goal |
|---|---|---|---|
| `hero-cta` (homepage) | "Start your run" (apply) + "Find a programme" | "What do you want to become?" search box, which opens the finder with your words, + "Start your run" | Leaving the hero for the finder, a programme or the application |
| `programme-cta` (programme pages) | Apply first, then Enquire, Call | "What will it cost?" first, then Apply, Enquire | Clicks on Apply or Enquire |

### Verification (end to end, in a real browser)

`scripts/ab-e2e.mjs` opens fresh, isolated browser sessions (each like a new visitor), checks the assigned variant is
the only one visible, clicks the goal in every other session, and compares with the server's counts.

| Run | Sessions | Split A / B | Views counted | Goals counted vs clicked | Forcing `?ab=` |
|---|---|---|---|---|---|
| 1 | 40 | 21 / 19 | 21 / 19 (exact) | 11 / 9 vs 11 / 9 (exact) | works |
| 2 (after the last changes) | 20 | random | exact | exact | works |

These runs check the machinery. The clicks are scripted, so their conversion rates say nothing about which design is
better. **Real results need real visitors:** after a redeploy, share the live link, then read `/lab`. At typical
conversion rates, about 100–400 visitors per variant are needed before a difference can be trusted. For the demo, the
two variants can also be shown side by side with `?ab=hero-cta:a` and `?ab=hero-cta:b`.

## Final quality check

Lighthouse 13.5, mobile, simulated slow 4G, production build. Homepage and Stories are repeat (warm) runs; the
programme and research pages are single runs. The first run after a server restart scores 5–8 points lower on
performance while the server prepares each image once.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Homepage | 93 | 100 | 100 | 100 |
| Stories (new) | 93 | 100 | 100 | 100 |
| Programme page (with the calculator) | 94 | 100 | 100 | 100 |
| Research (with missions) | 90 | 100 | 100 | 100 |

Lint and TypeScript are clean, the link check finds 0 problems and the UI audit finds 0 issues.

## Design tools

The design system lives in code as tokens (colours, type, spacing, motion in `app/globals.css`), so the design is
built and checked straight in the browser. Screenshots at each width were reviewed after every step. No Figma file
was made for this task.

## How to repeat

```
NEXT_PUBLIC_SITE_URL=http://localhost:3123 npm run build:verify && npm run start:verify -- -p 3123
node scripts/check-links.mjs http://localhost:3123 --ext
node scripts/ui-audit.mjs
node scripts/ab-e2e.mjs http://localhost:3123 40
```

## Deploy

The live preview predates this work (and Task 4's security headers). It needs a production redeploy before
submission so the judges see this version.
