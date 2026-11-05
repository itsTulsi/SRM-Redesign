# FINAL-DAY-TASKS.md — four features for the last build day

> **For Claude Code.** Read `CLAUDE.md` first. Every rule there still applies (no invented facts, no new
> dependencies without asking, WCAG 2.2 AA, Lite Mode, 180 KB JS budget, en/ta/hi). This file adds four
> features. Build them **in the order below**, one commit each, and keep the site runnable after every commit.

| Order | Feature | Time box | If time runs out, ship… |
|---|---|---|---|
| 1 | **Link previews**: preview images for WhatsApp, X and LinkedIn | 1 h | Programme pages only |
| 2 | **"How far is SRM from home?"**: arcs on the campus map | 2–3 h | The city picker + distance list, without arcs |
| 3 | **Tree finale**: "Your leaf is waiting" | 3 h | The static canopy, without the grow-in animation |
| 4 | **Works offline**: service worker + "Save for offline" | 2 h | Offline fallback page + cached pages, without the save button |

The easiest and lowest-risk work comes first. The service worker comes last because a bad one can keep
serving stale pages, so it gets the most testing time at the end.

---

## Ground rules for all four

- **No new npm dependencies.** Everything below uses what is already installed: Next.js (`next/og` is
  built in), GSAP, the browser's own APIs, and `sharp` (already in `node_modules` through Next) for one
  build-time script.
- **No invented facts.** Text, numbers and names come from `content/*.json` only. If a value is a `TODO`,
  leave that line out entirely. Never print "TODO" on a public image and never guess.
- **All interface text goes through next-intl** in `messages/en.json`, `ta.json` and `hi.json`. If a new
  namespace is used in a `"use client"` component, add it to `CLIENT_NAMESPACES` in
  `app/[locale]/layout.tsx`. After adding Tamil and Hindi strings, run `npm run i18n:review` so they are
  flagged for a native speaker.
- **Lite Mode and reduced motion** (`html[data-lite="on"]`, `html[data-motion="reduce"]`): every feature
  must still give the same information, with no animation.
- **Accessibility:** real links and buttons, tap targets ≥ 44 px, visible focus, status changes announced
  through an `aria-live` region, and nothing that works only on hover.
- **Performance:** animate only `transform`/`opacity` (the tree's existing `stroke-dashoffset` draw-in is
  the agreed exception). Load anything heavy only when its section is near the viewport. No CLS: reserve
  space for anything that appears after hydration.
- **After each feature:** run `npm run lint`, `npm run typecheck` and `npm run build`. Then run
  `npm run build:verify && npm run start:verify -- -p 3123` and check the feature at 360 × 800 and
  1440 × 900 with Playwright, with Lite Mode on, and keyboard-only. Commit with a clear message.
- **At the end:** update `DEMO.md` (new steps below) and the Highlights table in `README.md`. Re-run
  Lighthouse mobile on `/`, `/ta` and `/programmes/btech-cse` and update the numbers in `docs/AUDIT.md`.
  Accessibility, Best Practices and SEO must still be 100, and Performance ≥ 90.

---

## 1. Link previews (Open Graph images)

**Why:** in India, links to the site are mostly shared over WhatsApp. Today a shared programme link shows
no image. With this, it shows a branded card with the programme name and its fee.

### Build

1. **Site-wide default image:** `app/[locale]/opengraph-image.tsx`, at 1200 × 630, made with
   `ImageResponse` from `next/og`.
   - Background `--srm-blue-900` (#0B1B4D).
   - The SRM logo: read `public/brand/srm-logo-white.png` with `fs` and pass it as a data URL.
   - "Learn. Leap. Lead.", "NIRF 2025 · University #11", "NAAC A++". Read these from `content/stats.json`
     through `getContent`; never hard-code them.
   - Accent colour: `--leaf-green` / `--leaf-green-300`. Gold is for actions only, and an image is not an
     action.
2. **Programme image:** `app/[locale]/programmes/[slug]/opengraph-image.tsx`, with
   `generateStaticParams` so it is built at build time, like the page.
   - Shows the programme name, college, campus and duration.
   - Shows `₹X,XX,XXX a year` from `feesPerYearINR`, formatted with `Intl.NumberFormat("en-IN")`, **only
     if it isn't a TODO**. MBBS has no published fee, so it gets no fee line.
   - Shows "NIRF 2025 · <category> #<rank>" only where the college maps clearly to a NIRF category
     (Engineering → engineering, Medicine → medical, Dental → dental, Law → law, Management → management,
     Architecture → architecture, Pharmacy → pharmacy, Agriculture → agriculture). Otherwise show
     University #11.
3. **Same pattern** for `campuses/[slug]` (campus name, city, "45 km from Chennai Central" from
   `distanceFromChennai` when present) and `stories/[slug]` (title + dek, plus the story's photo if it is
   a local file).
4. **Twitter/X:** export the same image as `twitter-image.tsx` (re-export), and set
   `twitter: { card: "summary_large_image" }`.
5. **Metadata:** add `openGraph` to each `generateMetadata`: `title`, `description`, `siteName`,
   `locale` (`en_IN` / `ta_IN` / `hi_IN`), `type` (`website`, or `article` for stories), and
   `alternateLocale`. Also export `alt` from each image file.

### Fonts: watch out for this

- `next/og` (Satori) cannot read woff2, so the fonts `next/font` downloads won't work here. Download
  **TTF** files of Space Grotesk Bold and Inter Regular (OFL-licensed, from Google Fonts) into
  `assets/og-fonts/`, load them with `fs.readFile`, and note the licence in
  `content/media-credits.json` or a `README` in that folder.
- **Satori cannot shape Tamil or Devanagari correctly**: conjuncts and vowel signs come out broken.
  Render one Tamil sample first and look at it. If it is broken (expected), **all locales use English
  text on the image**. The page's own `og:title`/`og:description` stay in the page's language. A
  correct English image is better than a broken Tamil one.

### Deploy requirement

`metadataBase` comes from `NEXT_PUBLIC_SITE_URL`. **It must be set to the real https URL in Vercel**, or
every `og:image` will point at `localhost:3000` and previews won't load. Add this to `README.md` under
"Getting started".

### Done when

- `curl -s localhost:3123/programmes/btech-cse | grep -o '<meta property="og:[^>]*>'` shows `og:image`,
  `og:title`, `og:description` and `og:locale`.
- Each image opens at 1200 × 630, is under 300 KB (WhatsApp drops large previews), and has no "TODO"
  text. Save the CSE, MBBS and Kattankulathur images to `docs/screenshots/og-*.png` and look at them.
- First-load JS is unchanged: images are separate routes.

---

## 2. "How far is SRM from home?" (campus map extension)

**Why:** the campus map is already the "wow" part. This makes it personal: a parent in Madurai picks
their city and sees a glowing arc to every campus, with the nearest highlighted.

### Data

- New file `content/map/cities.json`, about 60 Indian cities: every state and UT capital, the main
  Tamil Nadu cities (Madurai, Coimbatore, Salem, Tirunelveli, Vellore, Erode, Thanjavur, Thoothukudi,
  Kanyakumari, Hosur, Puducherry…), and the large cities SRM recruits from (Bengaluru, Hyderabad,
  Kochi, Thiruvananthapuram, Mumbai, Pune, Kolkata, Patna, Lucknow, Jaipur, Guwahati…).
- Fields: `slug, name, nameTa, nameHi, state, lat, lng`.
- Coordinates from OpenStreetMap/Nominatim (city centre). Put the source and date in `_note`, as
  `campuses.json` does. If a coordinate can't be verified, leave that city out; don't guess.
- Add a check for the new file in `scripts/check-content.mts`: lat/lng present, and inside the map
  bounds in `content/map/projection.json`.

### Behaviour

1. Above the "Find your campus" list in `components/map/CampusExplorer.tsx`, add a compact control:
   - **"Where are you coming from?"**: a native `<select>` grouped by state (`<optgroup>`). It's
     accessible and gives phones their own picker.
   - **"Use my location"** button: calls `navigator.geolocation` **only on click, never on load**
     (Lighthouse Best Practices penalises asking on load). Under the button: "Your location stays on
     this device." Distances are computed in the browser, and nothing is sent to a server.
2. On selection:
   - A **home pin** appears at `project(lat, lng)` from `lib/map.ts`.
   - **Arcs** draw from home to every SRMIST campus and sister university.
   - The camera (the existing `camera` `{x, y, z}` transform) moves to fit home and the nearest campus.
3. **Arcs:**
   - An SVG layer inside the map stage, so it moves with the existing camera transform.
   - Each arc is a quadratic curve bowed away from the straight line (reuse the `curve()` idea from
     `lib/tree.ts`), with `vector-effect="non-scaling-stroke"` so lines stay thin when zoomed.
   - The nearest campus's arc is `--leaf-green-300` and thicker; the others are faint.
   - Draw-in uses `stroke-dashoffset` with `pathLength={1}`. Under Lite Mode or reduced motion, arcs
     appear fully drawn instantly.
   - The arc layer is `aria-hidden`; the list below carries the information.
4. **Distance list:** each campus row gains "≈ 412 km" and the rows re-sort nearest-first, with a
   "Nearest" badge on the first. **Label it as straight-line distance** ("as the crow flies"). We have
   no road or travel-time data, so don't show times. For Kattankulathur, the existing
   `distanceFromChennai` road-distance text can stay as it is.
5. **Directions:** the detail panel's Directions link gets an origin. Extend `directionsUrl()` in
   `lib/map.ts` with an optional `origin` (`&origin=lat,lng`).
6. Announce the result through the existing `announce` live region, e.g. "Nearest campus: Tiruchirappalli,
   about <n> km."
7. Remember the chosen city in `localStorage` (wrapped in try/catch) so the arc is there next visit.
   Clearing it is a "Clear" button.
8. **Haversine** in a small pure function in `lib/map.ts`, with Earth's radius 6371 km, rounded to the
   nearest 5 km (or 1 km under 50 km).

### No JS and Lite Mode

- The control is rendered by the client component. Reserve its height (`min-h-*`) so nothing shifts.
- Without JS the map and list work exactly as now.
- In Lite Mode everything works, with no animation.

### i18n

Add the new strings to `Acts.explore` (already a client namespace): `fromLabel`, `useLocation`,
`locationPrivacy`, `nearest`, `straightLine`, `clear`, `nearestAnnounce`, `locationDenied`. City names use
`nameTa`/`nameHi`.

### Done when

- At 360 px, picking "Madurai" draws arcs, marks Tiruchirappalli nearest, the list re-sorts, and there
  is no horizontal scroll and no overlapping labels. Re-run the map label check from `docs/AUDIT.md`.
- Keyboard: Tab to the select, choose with the arrow keys, and the result is announced.
- Denying location permission shows a polite message and leaves the select usable.
- The homepage's First Load JS grows by less than 5 KB. `cities.json` is passed from the server
  component (`Explore.tsx`) as a prop, trimmed to the current locale's fields.

### Demo line

"Here's a parent in Madurai." Pick Madurai, the arcs fly out, and Trichy is nearest.
Open Directions.

---

## 3. Tree finale: "Your leaf is waiting"

**Why:** the Living Tree is our signature, but today it is a small icon in a corner. This gives it a
payoff. At the end of Act III the tree is fully grown, every leaf is a real person or project that
started at SRM, and one empty leaf is the visitor's: **Apply**.

### Placement

- At the very end of `components/acts/ActLead.tsx`, after Placements (still inside Act III, so the
  homepage order in CLAUDE.md §1 is unchanged).
- New `components/tree/TreeFinale.tsx` (server component) plus the minimum client code for motion.

### Shape

- Add `generateCanopy(slots: number, seed = 2026)` to `lib/tree.ts`.
- It returns the same trunk and branches as `generateTree()` (same seed, so it is clearly the same tree,
  only grown) plus `slots` **leaf positions** spread over the branch tips: deterministic, non-overlapping,
  as fractions of the viewBox.
- It must stay an original procedural tree. Never trace the SRM emblem.

### Leaves = real content only

- Alumni from `alumni.json` (6): link to `/#alumni` (the existing anchor) or the alumnus's anchor if you
  add `id={a.slug}` to each card.
- Student work from `stories.json` `studentWork` (Camber, Swift Student Challenge, Paperplane): link to
  `/stories/<slug>`.
- Startups from `startups.json` (about 18): link to the ecosystem anchor on the homepage.
- **One empty leaf**, outlined and glowing. Label: **"Your leaf is waiting"**. Link:
  `/admissions#apply`. It is the one place in the finale where gold is correct, because it is the Apply
  action: ink text on gold.

### Markup (accessibility first)

- The tree drawing is an SVG with `aria-hidden="true"`.
- The leaves are **real `<a>` elements**, absolutely positioned over the SVG at their leaf coordinates
  (percent `left`/`top`), each with a 44 px hit area around a smaller visible leaf. They are in the SSR
  HTML, so they are crawlable and work without JS.
- The whole canopy is a `<ul>` with `aria-label="People and projects that started at SRM"`, so a screen
  reader hears a clean list.
- **Hover and focus** (`:hover`, `:focus-visible`) reveal a small card next to the leaf: photo or logo,
  name, one line (role for alumni, dek for stories). It is CSS only. **Tap navigates directly**, with no
  hover-only content.
- **Phones (< 1024 px):** 27 leaves with 44 px targets don't fit in a 360 px tree. Show the tree drawing
  with the leaves as decoration only, then below it a 2-column list of the same links (photo + name),
  then the gold "Your leaf is waiting → Apply" button full width.

### Motion (enhancement only)

- Add a scene in `lib/motion-scenes.ts`: when the finale enters, the branches draw in quickly, then the
  leaves pop in with a stagger (`scale` 0 → 1 and `opacity`, transform-origin at the leaf stem). The
  empty leaf arrives last and pulses gently three times, then stops.
- **Hand-off:** while the finale is on screen, hide the small fixed `LivingTree`. In
  `components/tree/TreeScroll.tsx`, treat the finale's top as the end of the visible range, so the small
  tree "becomes" the big one.
- Lite Mode or reduced motion: the tree and all leaves are shown fully grown, with no pulse.

### Copy (all three languages)

- Heading: **"Every leaf started here."**
- Sub-line: "Alumni, champions and founders: people who learned, leapt and now lead."
- Empty leaf: "Your leaf is waiting", with the button "Apply for 2027".
- **Check before using "2027":** if `content/site.json` has no published 2027 admissions information,
  use plain "Apply" instead. Don't invent a cycle.

### Done when

- Desktop: each leaf is reachable by Tab in a sensible order (left to right, top to bottom), shows its
  card on focus, and Enter opens the right page.
- 360 px: no horizontal scroll, the list is readable, and the Apply button is ≥ 44 px tall.
- Reduced motion: the canopy appears fully grown on first paint.
- axe on `/`, `/ta` and `/hi` at 360 px still reports 0 violations.
- No layout shift as leaves animate (they are positioned from the start and only scale and fade).

### Demo line

Scroll to the end of Act III: the tree is full grown. Hover Sriram Krishnan's leaf, then point to the empty
gold leaf: "This one's yours."

---

## 4. Works offline (service worker, no library)

**Why:** applicants on trains and in rural areas lose signal. Lite Mode already makes the site light;
this makes the important pages work with **no connection at all**, which no university site does.

### Files

- `app/manifest.ts`: name "SRM Institute of Science and Technology", short_name "SRMIST", `start_url: "/"`,
  `display: "standalone"`, `background_color` and `theme_color` `#0B1B4D`, icons 192 and 512 (plus a
  maskable 512).
- `scripts/build-icons.mts`: makes the PNG icons from `app/icon.svg` with `sharp` (already present via
  Next; it is **not** a new dependency, so don't add it to `package.json`). Commit the PNGs to
  `public/icons/`.
- `public/sw.js`: a hand-written service worker, plain JS, about 150 lines. **Don't add `next-pwa` or
  Workbox.**
- `components/ui/OfflineSupport.tsx`: a client component that registers the worker and shows the
  offline banner. Mount it in `app/[locale]/layout.tsx`.
- `app/[locale]/offline/page.tsx`: the offline fallback page, in all three locales. It says "You're
  offline", lists the pages saved on this device, and shows the admissions phone numbers as `tel:`
  links, which work without data. Exclude it from the sitemap and give it `robots: { index: false }`.

### Caching strategy in `sw.js`

| Request | Strategy |
|---|---|
| Page navigations (HTML) | **Network first**, 3 s timeout → cached copy → `/<locale>/offline` |
| `/_next/static/*` | Cache first (file names are hashed and immutable) |
| `/_next/image*`, `/media/*`, `/map/*`, `/brand/*` | Stale-while-revalidate, **capped at 80 entries** (delete the oldest) |
| `/api/search-index/*` | Stale-while-revalidate, so homepage search works offline |
| `/api/ask`, `/api/assistant` | Network only. Offline, the UI says "You're offline. Call admissions:" with the numbers |
| `/api/enquiry` (POST) | **Never cache, never queue.** Offline, the form says plainly that nothing was sent. Keep the typed text in the form (`sessionStorage`) so they can send it later. Never pretend it was sent |
| YouTube, OpenStreetMap, any other origin | Not touched by the worker |

- **Precache on install:** `/`, `/ta`, `/hi`, their `/offline` pages, `/programmes`, `/admissions`,
  `/hostels`.
- **Cache names:** versioned, e.g. `srm-v1-pages`, `srm-v1-static`, `srm-v1-media`. On `activate`, delete
  every `srm-*` cache that isn't the current version, then `clients.claim()`.

### "Save for offline" button

- On every programme page and on `/hostels`, a small button reads "Save for offline".
- On click it `postMessage`s the worker to cache that page, its images, `/programmes` and `/admissions`,
  then shows "Saved. This page works without internet." in an `aria-live` region.
- It only appears when `'serviceWorker' in navigator` and the worker is active.
- The offline page lists what's saved by reading the `srm-v1-pages` cache keys.

### Offline banner

When `navigator.onLine` turns false, a slim banner appears under the header: "You're offline, showing
saved pages." It is `role="status"`, disappears on `online`, and must not cover content (no CLS: it
overlays the top of the page, it doesn't push it down).

### Registration rules

- Register **only in production builds** (`process.env.NODE_ENV === "production"`), and only after
  `afterLoadIdle()` (`lib/after-load.ts`), so it never competes with LCP.
- In development, **unregister** any existing worker, so `npm run dev` never serves stale pages.
- Add to `next.config.ts` `headers()`: `/sw.js` gets `Cache-Control: no-cache, no-store, must-revalidate`
  and `Content-Type: application/javascript; charset=utf-8`.
- The middleware matcher already skips paths with a dot, so `/sw.js` and `/manifest.webmanifest` aren't
  touched by i18n routing. Confirm this.
- **Kill switch** (write it in `README.md`): if a bad worker ships, deploy a `sw.js` that calls
  `self.registration.unregister()` and deletes all `srm-*` caches.

### Done when

Test with Playwright (`context.setOffline(true)`) against `start:verify`:

1. Visit `/` and `/programmes/btech-cse`, press Save for offline, go offline, and reload both. Both
   render fully, with images.
2. Offline, open a page never visited. The offline page appears with saved pages and working `tel:`
   links.
3. Offline, the hero search still returns programmes. Ask SRM shows the offline message. The enquiry
   form says nothing was sent and keeps the text.
4. Back online, deploy a change (bump the cache version) and reload. The new content shows on the first
   network-first load, and the old caches are deleted.
5. Lighthouse: Best Practices still 100, and Performance unchanged (the worker registers after idle).
   Application → Manifest shows no errors.

### Demo line

Open a programme, tap "Save for offline", then turn on airplane mode on the phone and reload: "Still here,
fees and all."

---

## DEMO.md additions (in walkthrough order)

1. Paste a programme link into WhatsApp Web: the preview card appears (feature 1).
2. Map: "a parent in Madurai". Arcs appear, with Trichy nearest (feature 2).
3. End of Act III: the tree canopy, with the empty gold leaf for Apply (feature 3).
4. Airplane mode: the saved programme page still loads (feature 4).

Keep the full walkthrough under 90 seconds. Record it as a screen capture too, as a backup in case the
venue's Wi-Fi fails.
