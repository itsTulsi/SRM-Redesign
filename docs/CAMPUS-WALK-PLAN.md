# Walk SRM: implementation plan (for approval)

A playable, walkable 3D Kattankulathur campus inside our website, in the spirit of Abeto's **Messenger**
(messenger.abeto.co). You arrive at the SRM gate as a student character, walk the real campus layout, talk to people
at real buildings, take small campus quests, and every building is a doorway into the right page of our site.

Status: **plan only. Nothing is built until this is approved.** Decisions needed are in section 11.

---

## 1. What we are copying from Messenger, and what we are not

Messenger (Vicente Lucendo, Michael Sungaila, music by Kevin Colombin; Three.js + WebGL, no game engine) is a cozy,
10-minute browser game on a tiny round planet. From public coverage of the game:

| Messenger has | We build | Notes |
|---|---|---|
| A tiny world you walk on; the horizon curves away | The real Kattankulathur campus, with a gentle **curved-horizon shader**, so it reads as a small planet while staying a true map | Option to keep it flat (decision 1) |
| Walk with mouse (click/hold) or WASD | Same, plus a touch joystick and tap-to-walk on phones | |
| Residents who give you delivery jobs; about 10 minutes to finish | 6 **campus quests** at real buildings, about 10 minutes, each raising one of our four stats (Build, Think, Connect, Grow) | Ties into the "Level up" theme already on the homepage |
| Talk to characters in short, simple lines | Speech-bubble dialogue with 2–3 reply choices; every fact comes from our verified content files | Optional free-text questions through our free AI (decision 4) |
| Emote button: about 10 emotes float above you | Emote wheel: wave, thumbs up, laugh, heart, "vanakkam", "namaste", cheer, question, celebrate, Leafy | |
| Outfit menu: hair, top, bottom, shoes | Outfit menu: hair, skin tone, top (SRM colours, club tees, lab coat), bottom, shoes, bag | |
| Job list in the top-right menu | Quest log (top right) + a small campus mini-map with the next target | |
| Other players visible (emotes only, no chat) | **Phase 2, optional** (decision 2): other visitors as walking avatars with emotes, no chat | Needs a realtime server |
| Calm ambient music | Off by default; one toggle; a free-licence track or campus ambience (birds, traffic, bells) | Decision 5 |

**What we will not do:** copy any of Messenger's art, models, music or code; use real people (living students, staff or
alumni) as characters; invent facts about SRM; trace the SRM emblem.

---

## 2. Where it lives on the site

- **New page:** `/walk` (and `/ta/walk`, `/hi/walk`), a "Walk SRM" chapter page in the Level up theme. Hero with a
  "Begin" button (like Messenger's), then the game full-screen. Below it: the same places and quests as an accessible
  list (section 8).
- **Entry points:** homepage map chapter ("Walk Kattankulathur"), the Kattankulathur campus page, the hostels page
  (walk to your hostel), the nav under Campuses ("Walk the campus"), and Leafy ("Show me around").
- **The point for the website:** every building card has "Go to the page" (Library leads to Research, Tech Park to
  B.Tech CSE, the hostels to `/hostels`, University Building to Admissions, and so on). The game is a fun front door to
  real information, not a separate toy.

---

## 3. The world: the real campus, from open data

**Source:** OpenStreetMap (© OpenStreetMap contributors, ODbL), the same licence and pipeline we already use for the 3D
hostel finder (`scripts/build-campus-3d.mjs`, `public/map/ktr-campus.json`). A fresh Overpass query (6 Nov 2026) over
the campus area returned **108 named places**, enough for a recognisable campus. Footprints are accurate to OSM; heights
come from OSM levels, our hostel floor counts, or a labelled estimate (the page says heights are approximate).

### Landmarks we can place from OSM (name and position as mapped)

| Area | Places (OSM names) |
|---|---|
| Arrival | SRM In Gate / Out Gate bus stops, SRM University bus stop, University Building bus stop, Potheri railway halt, SRM Potheri station stop |
| Admin and study | SRM University Building, SRM Library, Main Block, High Tech Block, Electrical Sciences Block, Mechanical Block, Mechanical PG Block, C V Raman Block, Biotech Block, Architecture Block, MBA Block |
| Tech | SRM Tech Park, Tech Park 2, SRM Innovation and Incubation Center, BEL Lab |
| Making things | Aerospace Hangar, Mechanical Hangar |
| Events | TP Ganesan Auditorium, TP Stairs |
| Food and hanging out | Java Food Court, Vendhar Square, Tea Stall, Domino's, the park near SRM Apartments |
| Hostels | Paari, Kaari, Oori, Adhiyaman, Nelson Mandela, Agasthiyar, Manoranjitham, Meenakshi, Sannasi C Block + mess, Kalpana Chawla, M Block (girls), N Block (men), D Block (men) |
| Health | SRM General Hospital, SRM Medical College Hospital and Research Centre, SRM Global Hospitals, blood bank |
| Faith | Ganesh Temple, Shiva Temple, Sai Temple, Mosque & Church |

We include only what the campus needs: no mortuary, no private apartments or shops outside SRM, and no Zoho or
neighbouring campuses. Unmapped buildings stay plain grey blocks without names. **The team should walk the list
once** to confirm names and spot anything wrong or missing; OSM is volunteer-mapped.

### The world build (one script, run once, output committed)

`scripts/build-campus-walk.mjs`, extending today's script:

1. Overpass query for buildings, roads, footpaths, water, parks and named points in the campus box.
2. Project to metres around the campus centre; simplify footprints; give each building a height and a colour family
   (academic, hostel, food, health, faith, tech).
3. Write `public/walk/ktr-world.json` (target **under 250 KB gzipped**): buildings, roads with widths, paths, water,
   trees (seeded scatter on open ground), landmarks with their info cards, NPC spots and quest targets.
4. Collision data: the same footprints as 2D polygons, plus a padding margin.

---

## 4. Look and feel

- **Style:** cozy low-poly toon. Flat colours with soft gradient lighting, thick soft shadows under the character, warm
  afternoon Chennai light, a lilac-to-gold sky that matches our theme. Buildings are extruded footprints with a roof
  cap, window strips (a texture atlas) and a coloured band per type; landmarks get a hand-made accent (Tech Park glass,
  Library columns, Java awning, Auditorium stairs).
- **Curved world** (default, decision 1): a vertex-shader bend so the ground falls away with distance. It gives the
  Messenger "tiny planet" feel and hides far geometry. Collision and the map stay flat underneath.
- **Life:** trees sway, flags and bunting move, a few ambient walkers on footpaths (simple loop animations), buses
  arrive at the gate stop, birds over the lake. All of it is cheap instancing.
- **Time of day:** matches Chennai time, like the homepage clock (morning, afternoon, evening, night with lit
  windows).

## 5. The character

- **Player avatar:** a stylised student (not a real person) with idle, walk, run, wave, sit and celebrate
  animations. Recommended source: a **CC0 rigged character pack** (for example Quaternius's modular characters or
  Kenney's mini characters; licence checked before download), recoloured and dressed in our own outfits. Alternative:
  a custom character modelled in Blender by the team (decision 3). Budget **under 1 MB** (GLB, Draco/meshopt).
- **Outfits:** hair (6), skin tone (6), tops (SRM navy/gold, Camber Racing team tee, lab coat, kurta, hoodie, NCC),
  bottoms, shoes, bag. Saved on the device only.
- **Leafy** walks along as a little companion when you are lost, pointing at the next quest.

## 6. Talking, quests and buildings

### People to talk to (roles, not real people)

| Who | Where | Talks about (only from our content files) |
|---|---|---|
| Admissions counsellor | SRM University Building | How to apply, the real phone numbers, enquiry form |
| Senior at Java | Java Food Court | Lines from our Ask a Senior threads (marked as demo content, as on programme pages) |
| Camber Racing member | Mechanical Hangar | Formula Bharat 2026 facts from `stories.json` |
| Librarian | SRM Library | Research missions and numbers from `research.json` / `stats.json` |
| Founder | Innovation and Incubation Center | Startups from `startups.json` |
| Hostel warden | Paari/Kaari area and M Block | Hostel blocks, rooms and 2026–27 fees from `hostels.json` |
| Tech Park student | SRM Tech Park | Programmes from `programmes.json` (links to the finder) |
| Leafy | Everywhere | Help, hints, "take me to…" |

Dialogue is short (Messenger-simple English), with 2–3 choices. Each line is ordinary DOM text over the canvas, so it
is translatable (en, ta, hi), readable by screen readers and never baked into 3D. With the free AI switched on
(decision 4), "Ask something else" sends the question to our existing grounded assistant (`/api/assistant`), which
answers only from our data or hands over to admissions.

### Campus quests (about 10 minutes, each raises a stat)

1. **First day** (Connect): get off at the gate bus stop, find the University Building, collect your ID card.
2. **Lunch rush** (Grow): carry an order from Java Food Court to a friend at Vendhar Square.
3. **Pit crew** (Build): the Camber team at the Mechanical Hangar needs a part from the Aerospace Hangar.
4. **Overdue** (Think): return a book to the SRM Library and hear about a research mission.
5. **Pitch day** (Build): take a founder's pitch deck to TP Ganesan Auditorium.
6. **Home** (Connect): find your hostel; the warden shows you the rooms and fees, and the card links to `/hostels`.

Finishing all six shows a "Level up" card in our homepage style (your stats, your outfit, a shareable image), with
"Find your programme" and "Apply".

### Building cards

Walk up to any named building and a card slides in: name, what it is, a real SRM photo if we have one, verified facts
only, and "Go to the page". "Fast travel" in the map menu jumps to any landmark.

## 6a. The four reference elements, matched one by one

These are the four Messenger elements the team picked from the design gallery. Each one gets a matching element in
our build, and is checked against the reference before its phase is called done.

### Mobile thumbnail: the phone experience
- **Portrait first.** The game is designed at 360 × 800 and scales up. The canvas fills the screen. Controls sit in
  the thumb zones: joystick bottom left, actions bottom right (Talk, Emote, Outfit), Quests and Map top right, Pause
  top left. Each control is 48 px or more and sits clear of the iPhone home bar and Android gesture area.
- **The opening screen** is the "thumbnail": a still of your character at the SRM gate under the lilac sky, the title
  "Walk SRM", one Begin button, and a small "Explore without the game" text-tour link. The same image (rendered once,
  committed as WebP) is the page's link-preview image, so a shared `/walk` link looks like the game.
- **The finish card** is a portrait image (your character, your four stats, "I levelled up at SRM") made for sharing to
  WhatsApp and Instagram stories via the Web Share API, with a download fallback.

### Character Configuration: the outfit screen (UI component)
- **Opened** from the shirt button (bottom right), from the opening screen ("Make your student") and from the pause
  menu. The camera eases to a close-up of the character, who turns slowly; drag to spin them.
- **Layout:** category tabs as round icon buttons (Hair, Skin, Top, Bottom, Shoes, Bag), with a swatch strip under
  them. On a phone it's a bottom sheet covering 45% of the screen with the character above it; on desktop, a side
  panel. Changes show instantly on the model; a "Random" dice and a "Done" button.
- **Choices:** hair 6, skin tone 6, tops 8 (SRM navy/gold, Camber Racing tee, lab coat, kurta, hoodie, NCC, sports
  jersey, plain tee), bottoms 5, shoes 4, bags 4. Implemented as mesh visibility toggles plus colour swaps on one
  rigged model, so a change costs nothing to load.
- **Accessible:** a real radio group per category (arrow keys move, names announced: "Top: Camber Racing tee"); the
  choice is saved on the device.

### NPCs: interaction
- **Noticing:** people stand at their buildings doing something (the Camber member works on a wheel, the senior
  sits at a Java table, the librarian stacks books). When you come within about 4 m they turn their head to you, a
  bubble with "…" and their role ("Librarian") appears above them, and the Talk button lights up.
- **Talking:** the camera frames you both (over the shoulder); a speech card slides up from the bottom with the
  character's name, role and a portrait icon. Lines type in quickly (tap to show the whole line) and give 2–3 reply
  chips. Quest steps show as a stamp on the card ("Quest: Pit crew, step 2/3").
- **Body language:** NPCs wave when you arrive, nod while talking, and react to your emotes (a wave gets a wave back,
  a heart gets a smile).
- **Leaving:** walk away or press Esc. The card slides down and the camera returns to follow.
- **Accessible:** dialogue is DOM text in an `aria-live` region; reply chips are buttons; nothing is timed.

### Character Navigation: moving around
- **Input:** WASD/arrows (Shift to run), click or hold to walk towards the pointer, tap-to-walk with a ripple marker
  where you tapped, and a virtual joystick on touch screens.
- **Movement feel:** acceleration and easing (no instant stops); the character turns to face the movement direction
  smoothly; walk/run blend by speed; footstep dust puffs; slides along walls instead of sticking.
- **Path finding:** tap a far point or a building on the map and the character walks there along roads and footpaths
  (A* on a walk graph built from OSM footways and roads), and stops at the door.
- **Way-finding:** a soft arrow on the ground towards the current quest target, the mini-map with your position and
  heading, and building name labels that fade in as you approach.
- **Camera:** a follow camera with gentle lag; it looks ahead in the direction you walk, rises when you run, and
  pulls in under trees and beside walls so the character is always visible.

## 7. Controls and camera

- **Desktop:** WASD or arrow keys; Shift to run; click or hold the mouse to walk towards the pointer; E (or click) to
  talk; Q for the emote wheel; M for the map; Esc to pause.
- **Phone:** left-thumb virtual joystick, or tap a spot to walk there; tap a person to talk; buttons bottom right for
  emote and outfit (as in Messenger); top right for quests and the map.
- **Camera:** third-person, slightly high, follows smoothly; drag to orbit, pinch or scroll to zoom within limits;
  it moves in front of walls so the character is never hidden.
- **Collision:** 2D polygon tests against footprints plus the campus boundary; no physics library needed.

## 8. Accessibility, Lite Mode and performance (our §8 bars still apply)

- The game is an **enhancement**. The `/walk` page works with no WebGL, in Lite Mode, with reduced motion and with a
  screen reader: an accessible "text tour" lists the same places (with photos and links), the same people and their
  lines, and the quests as a checklist.
- **Keyboard:** the game is fully playable from the keyboard; dialogue, menus and cards are real buttons with focus
  rings; Esc always pauses; a visible "Skip the game" link.
- **Motion:** reduced motion disables the camera bob and the curved-world wobble and uses instant cuts; there's a pause
  button (WCAG 2.2.2).
- **Audio:** off by default; never autoplays.
- **Loading:** nothing loads until "Begin" is pressed. The page's own first-load JS stays under our budget; three.js
  and the game chunk are dynamically imported. Total download target: **under 4 MB** (world, character, textures,
  code), with a progress bar.
- **Frame rate:** 60 fps on a mid-range laptop, at least 30 fps on a ₹8,000-class Android. Merged geometry per colour
  family, instanced trees and props, one shadow (blob) for the character, dynamic resolution, a low-quality preset
  chosen automatically.
- **Privacy:** outfits and progress are stored on the device only; no account.

## 9. Code layout

```
app/[locale]/walk/page.tsx            page: hero + Begin, game mount, accessible text tour
components/walk/
  WalkGame.tsx                        dynamic-imported client entry (Canvas, loader, UI overlay)
  World.tsx                           ground, roads, water, buildings (merged), trees (instanced), sky, curve shader
  Player.tsx                          avatar, animation state machine, controls (keys/pointer/joystick), collision
  Npc.tsx, Ambient.tsx                people to talk to; ambient walkers, buses
  ui/ (Dialogue, QuestLog, MiniMap, EmoteWheel, Outfit, BuildingCard, Joystick, PauseMenu, Finish)
  TextTour.tsx                        the no-3D version of everything
lib/walk/ quests.ts, dialogue.ts, collision.ts, store.ts (device-only progress)
content/walk.json                     NPCs, dialogue keys, quests, building-to-page links (facts reference other JSON)
messages/{en,ta,hi}.json              Walk namespace (all lines translatable)
public/walk/ ktr-world.json, character.glb, atlas.webp
scripts/build-campus-walk.mjs         OSM → world JSON
```

Dependencies: **none new** if we use three, @react-three/fiber and @react-three/drei, which are already approved and
installed. Asset files (character GLB, optional music) are added with their licences in CREDITS.md. Multiplayer
(phase 2) would need one new service and dependency, so it gets a separate approval.

## 10. Phases (each one shippable, pushed after it is checked)

| Phase | What ships | Rough effort |
|---|---|---|
| 1. World | OSM world build script, `/walk` page with Begin, campus rendered with the toon style and curved horizon, free camera, text tour | 1 day |
| 2. Walking | Avatar with animations, keyboard/pointer/touch controls, collision, follow camera, building cards with "Go to the page", fast travel, mini-map | 1–1.5 days |
| 3. People and quests | 7 characters, dialogue UI, 6 quests, quest log, stats, finish card, translations | 1.5 days |
| 4. Polish | Outfits, emote wheel, ambient life, time of day, sound toggle, Leafy companion, loading screen, quality presets | 1 day |
| 5. Checks | 360 px phone pass, keyboard-only run, reduced motion, Lite Mode, Lighthouse on `/walk` (page itself ≥ 90/100/100/100), frame-rate check, link check | 0.5 day |
| 6. Optional | Multiplayer presence (other visitors as avatars, emotes only) | 1–2 days, separate approval |

## 11. Decisions for you

1. **Look:** curved "tiny planet" horizon like Messenger (recommended), or a flat, map-accurate campus?
2. **Multiplayer:** skip for now (recommended), or plan phase 6 (needs a realtime service, new dependency, may cost money on larger traffic)?
3. **Character:** CC0 asset pack restyled by us (recommended: faster and free), or a custom Blender character by the team?
4. **Free-text questions to characters** through our free AI assistant: yes (recommended, grounded and labelled) or scripted lines only?
5. **Music:** a free-licence ambient track, campus ambience sounds, or silence?
6. **Scope:** all six quests, or start with three (First day, Pit crew, Home) and add the rest after a demo?
7. **Accuracy check:** can someone from the team confirm the landmark list and names on campus (section 3)?

## 12. Risks and how we handle them

| Risk | Handling |
|---|---|
| OSM is incomplete or a name is wrong | Unnamed buildings stay generic; a team member checks names; the page says "map data © OpenStreetMap contributors, heights approximate" |
| Slow phones | Auto low-quality preset, smaller world radius, Lite Mode text tour; nothing loads before "Begin" |
| Asset licences | Only CC0/CC-BY assets with the licence recorded in CREDITS.md; no assets taken from Messenger |
| Facts in dialogue drift from the site | Characters read the same JSON the pages use; no hand-typed numbers in dialogue |
| Bundle and Lighthouse scores | The game is a dynamic import behind "Begin"; the page itself is static and light |

---

**Sources:** [80.lv: Deliver mail on a tiny colorful planet](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game) ·
[GIGAZINE: Messenger browser game](https://gigazine.net/gsc_news/en/20250929-messenger-browser-game) ·
[Wikiwand: Messenger (video game)](https://www.wikiwand.com/en/articles/Messenger_(video_game)) ·
OpenStreetMap Overpass query of the Kattankulathur campus area, 6 Nov 2026 (© OpenStreetMap contributors, ODbL).
