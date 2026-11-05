# Audit: CLAUDE.md §13 (2026-10-25)

Production build (`npm run build:verify` then `npm run start:verify -- -p 3123`), headless Chrome.

## Re-run on 2026-11-05, after the final-day features (FINAL-DAY-TASKS.md)

Link previews, "How far is SRM from home?", the tree finale and offline support are all in this build.

| Page (mobile, median of 3) | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` (English) | 93 | 100 | 100 | 100 | 3.23 s | 0 | 25 ms |
| `/ta` (Tamil) | 92 | 100 | 100 | 100 | 3.38 s | 0 | 35 ms |
| `/programmes/btech-cse` | 97 | 100 | 100 | 100 | 2.69 s | 0 | 5 ms |

- **All three bars hold:** Accessibility, Best Practices and SEO are 100, and Performance is at least 90. Two individual runs
  (one on `/ta`, one on the programme page) ended in a Lighthouse protocol timeout and were re-run.
- **Performance is 1–3 points lower than on 2026-10-26** (home 94 → 93, Tamil 94 → 92), with homepage LCP about
  0.15–0.3 s later. The LCP element is still the hero photo, and its delay is render delay, not loading. The new sections
  add HTML: the homepage is 68 KB compressed. Rendering the tree finale once for all screen sizes, rather than twice,
  cut it from 73 KB.
- **Homepage first-load JS:** 139 KB (budget 180 KB). The new features added about 3 KB.
- **axe-core 4.14 at 360 × 800:** all 147 sitemap pages, plus the three offline pages, have no violations, no
  sideways scroll, one `h1` each and no console errors.
- **Feature suites:** palette, compare, transitions and the 3D map, 36 checks; home distance, 27; tree finale, 19;
  offline, 18. All pass.
- **Test note:** long runs on this Mac stalled whenever it slept (its power log shows it). The same pages run with
  `caffeinate` were clean every time.

**Re-run on 2026-10-25 with 27 real photos, the filled-in content and the official SRM logo in the header:** home 94 / 100 / 100 / 100 (LCP 3.1 s simulated, CLS 0; it was 96 before the logo's extra 7 kB request), B.Tech CSE programme page 98 / 100 / 100 / 100 (LCP 2.5 s); all 135 sitemap URLs pass the 360 px axe + overflow crawl. The hero video and Camber car video are still missing, so re-run once they arrive.

## Lighthouse (mobile)

Median of 3 runs per page.

| Page | Performance | Accessibility | Best Practices | SEO | CLS |
|---|---|---|---|---|---|
| `/` (English) | 96 | 100 | 100 | 100 | 0 |
| `/ta` (Tamil) | 95 | 100 | 100 | 100 | 0 |
| `/hi` (Hindi) | 95 | 100 | 100 | 100 | 0 |

- **LCP, Lighthouse simulated throttling:** 2.77–2.92 s on the three homepages and about 2.5 s on inner pages. This is above the 2.5 s bar on the homepages.
- **LCP, applied throttling (4G + 4× CPU slowdown):** 1.47–1.55 s, with Performance 99–100. The real-device budget in §8 is closer to this setting.
- **LCP, no throttling:** 370 ms.
- **INP:** not measurable in the lab. Check field data after deploy (Vercel Speed Insights or CrUX).
- **Homepage first-load JS:** 136 KB, against a 180 KB budget. GSAP, Lenis, Fuse and the search index load after first use or after idle.

## Accessibility and layout

| Run | Scope | Result |
|---|---|---|
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A+AA + best practice) | All 132 sitemap URLs (every page × en/ta/hi) at 360 × 800 | 0 violations |
| Horizontal overflow | Same 132 URLs, checked while scrolling the full page | None |
| Headings, console | Same 132 URLs | Exactly one `h1` per page; no console errors |
| Keyboard only (Tab through the whole page) | Home at 1280 and 360 px; programme, admissions and campus pages | Skip link first. Every stop shows a focus ring, is on screen and is not hidden behind the sticky header; Tab cycles through with no trap. The hero input's ring is drawn on its wrapper (`focus-within`). |
| Reduced motion (`prefers-reduced-motion: reduce`) | Home en/ta, programme page, at 1280 and 360 px | Lite Mode on with the reason shown. No Lenis, no pinning, no video or 3D. Tree drawn fully grown. |
| Lite Mode, manual toggle | Home en/hi, admissions, at 360 px | Same as above |
| Lite Mode, automatic | Emulated slow 3G connection | Switches on with reason "slow-network" |
| Map labels and tap targets | Overview map at 360, 412, 768, 1024 and 1440 px × en/ta/hi | No label overlaps another label or pin. No label is clipped. Tapping any dot or label opens that pin. |

## Fixed during the audit

- **Wrong canonical URL (SEO 92).** Every page canonicalised to the homepage. Each page now declares its own canonical and hreflang alternates (`lib/page-metadata.ts`). Added a sitemap (132 URLs with per-locale alternates), `robots.txt` and a favicon.
- **Tamil layout shift (CLS 0.31).** The Noto font swapped in after first paint. Tamil and Devanagari web fonts now use `display: optional`, and the installed system Tamil/Devanagari fonts (local() "SRM Script" faces) come first. Hindi Performance rose from 85 to 95.
- **Initial JS and HTML weight.** The search index moved to a static per-locale `/api/search-index/[locale]`, fetched on first use. The motion layer and Fuse warm-up now wait for load plus idle. Client messages are trimmed to the namespaces the client actually uses.
- **Map at 360 px:**
  - Delhi's and Sikkim's labels collided; labels can now sit above or below a pin.
  - The Tamil "Tiruchirappalli" label was clipped.
  - The decorative pulse ring caught taps meant for the neighbouring Trichy pin.
  - Pins stay at their true coordinates throughout.
- **Apply landed on a dead end.** SRM's application portal sometimes answers "403 Forbidden" to ordinary browsers; it's a bot filter on SRM's servers. Every Apply button now goes to `/admissions#apply`. That section links to the portal and, right beside it, gives the fallbacks: SRM's Admissions 2026 page, phone numbers and the enquiry form.

- **A ₹ cost the homepage ~5 points.** Inter's Latin subset has no ₹, so the first fee on a page pulled Inter's 84 kB Latin-Extended file. A local-first "SRM Rupee" face (₹ only, from the device's fonts) fixed it: back to 96, 2 font files.

## How to re-run

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3123 npm run build:verify
npm run start:verify -- -p 3123
npx lighthouse http://localhost:3123/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo
```
