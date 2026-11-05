# SRM-GRAIL-REDESIGN.md

Brief for Claude Code. Redesign srmist.edu.in in the spirit of https://grail-app.com/ ("Grail: Real-world quests, every day").
Context: Next-Gen SRM Website Design Challenge. Judges want an innovative, non-traditional site. **No traditional blue-and-white.** Design quality is the main score. Time is short, so build the smallest thing that looks unforgettable.

---

## 0. Step ZERO: look at the reference properly (do not skip)

The person who wrote this brief could only read Grail's page metadata, not its rendered design. Open https://grail-app.com/ in a real browser (Playwright or Chrome), scroll the whole page, and write `REFERENCE.md` with what you actually see:
- palette (sample real hex values), type families and scale, hero layout, section order, card and button style, imagery, motion (what moves, easing, scroll behaviour), nav pattern, footer.
- Anything in section 2 below that contradicts what you see: **the real site wins.** Update this file.
- Do not copy Grail's copy, logo, illustrations or code. Borrow the *structure and feel*, make everything else original to SRM.

Verified from metadata only: title "Grail: Real-world quests, every day"; one daily real-world quest meant to break autopilot; four growth stats (Strength, Intellect, Charisma, Wisdom); game-like language ("quests", "stats", "graduate"); subscription that ends at graduation; theme colour `#FAFAFA`; social card `OG.png` 1200x630.

**Update after Step ZERO (2026-11-05, see `REFERENCE.md`):** the live site is mostly **black**, with off-white sheets
and one soft accent per section. It is not warm paper with lime and ember. Its display face is a light, uppercase,
high-contrast serif, not a grotesk. So the build uses a black ground, warm off-white sheets, kolam colours for the four
stats (kumkum red, turmeric, sky, leaf green), lime only for the single action, and Instrument Serif over Inter.
Content stays in `content/` (`content/quests.json`), not `data/`, because that's where this project's content checks
look.

## 1. Concept: "Level Up at SRM"

Grail turns real life into quests with stats. SRM's version: **a student's years at SRM as a character that levels up.** The site is not a brochure, it is a character sheet and a quest board.

- Hero: one big line + a live "character card" (original avatar, 4 stats, level bar). Visitor picks a path (e.g. "I'm into building / research / sport / startups") and the card fills with matching SRM things.
- Four stats, renamed for campus (keep the idea, not Grail's exact words):
  - **Build** (engineering, labs, Camber Racing-type teams)
  - **Think** (research, academics)
  - **Connect** (clubs, events, global programmes, placements)
  - **Grow** (sports, arts, wellbeing, entrepreneurship)
- "Quests" replace generic sections: each is a real thing a student does at SRM (join a team, ship a project, attend a fest, take a global semester). Each quest card: title, stat it raises, who does it, one real proof point.
- "Graduate" moment at the bottom: admissions CTA framed as "Start your run".

## 2. Sections (single-page scroll, 6 screens)

1. **Hero**: headline, character card, path picker, primary CTA "Start your run".
2. **The four stats**: four large cards, each opens its quest list.
3. **Today's quest board**: horizontally scrolling quest cards (real programmes, teams, labs). Data from `data/quests.json`.
4. **Proof wall**: verified numbers and achievements only. Placeholders `[TODO: from faculty]` until confirmed. Never invent stats.
5. **Campus in motion**: photo/video strip of real SRM media supplied by faculty (see `MEDIA.md` if present).
6. **Start your run**: admissions CTA, programme finder, contact.

Keep a plain, accessible fallback nav to the existing key links (Admissions, Programmes, Research, Placements, Contact) so nothing important is hidden behind the game idea.

## 3. Look and feel (design rules)

- **Not blue/white.** Warm, confident, a little playful. Suggested palette (adjust after REFERENCE.md):
  - `--ink: #14130F` text and dark panels
  - `--paper: #F6F1E7` warm ground (not pure white)
  - `--lime: #C6F432` primary accent (stat bars, CTA)
  - `--ember: #FF5A36` secondary accent (highlights, level-up)
  - `--moss: #1F3D2B` deep contrast panels
- Type: one characterful display face + one clean text face (e.g. Bricolage Grotesque / Space Grotesk / Inter). Huge headlines, tight leading, generous whitespace.
- Components: chunky rounded cards, stat bars, XP/level pill, sticker-style badges. Subtle, fast motion: number count-ups, card tilt on hover, a level-up burst when a path is picked. Respect `prefers-reduced-motion`.
- Mobile first. Touch targets at least 44px. Text contrast at least 4.5:1.
- No stock-photo hero, no sliders with arrows, no "Welcome to SRM" copy.

## 4. Tech

Use the project's existing stack (Next.js App Router, Tailwind, GSAP + Lenis for motion, next-intl en/ta/hi if already set up). Check `CLAUDE.md` and `package.json` first and follow them. Do not add heavy dependencies; if you want one, say why first.

- `data/quests.json` drives the quest board (id, title, stat, summary, proof, link).
- Path picker is plain client state, no backend.
- Performance: LCP under 2.5s on mobile, hero under about 200 KB of JS, lazy-load everything below the fold.

## 5. Guardrails

- Redesign on a branch (`feature/grail-redesign`); tag `pre-grail-redesign` first.
- Keep existing routes and content working. Reskin and restructure the home page first, then propagate tokens.
- Only use facts we can source. Everything else is a visible `[TODO]`.
- Credit any third-party fonts/assets in `CREDITS.md`.

## 6. Build order (about 6 hours of work, ship at each step)

1. `REFERENCE.md` from the live Grail site (30 min).
2. Tokens: colours, type, spacing, card and button components (45 min).
3. Hero + character card + path picker (90 min).
4. Four stats + quest board (90 min).
5. Proof wall + media strip + final CTA (60 min).
6. Motion polish, mobile pass, accessibility pass, Lighthouse (60 min).

## 7. Done means

- Home page feels like nothing else in education and nothing like blue-and-white.
- A judge understands the idea in 5 seconds: "my years here are a game I level up."
- Works on a phone, keyboard navigable, no console errors, no invented facts.
