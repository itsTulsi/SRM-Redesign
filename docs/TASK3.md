# Task 3: Responsive pages and free AI features

## Responsive
- Audited 12 pages at 360, 768, 1024 and 1440 px (home, programmes, a programme, admissions, campus, research, hostels,
  student life, compare, a story, Tamil home, Hindi programmes): no horizontal overflow, one h1 on each.
- Phone: 3D, pinned scenes and the ink reveal step aside; lists and filters stack; tap targets 44 px (logo and source links fixed).
- Tablet and laptop: checked in the browser at 768 and 1024 px.
- Cross-browser: `browserslist` in package.json (Chrome/Edge/Firefox 100+, Safari/iOS 15.4+, Samsung 18+). The build adds
  `-webkit-` prefixes for backdrop-filter and mask. Scroll-driven effects sit behind `@supports`, so older browsers
  simply see the finished layout. Tested in Chromium only; Safari and Firefox still need a manual pass.

## AI features, no paid service
| Feature | How it works | Cost |
|---|---|---|
| Ask SRM assistant (en/ta/hi) | Rule-based, answers only from verified content | Free, offline-capable |
| Programme matcher + instant search | Fuse.js fuzzy search, understands interests ("I like robots") | Free |
| Programmes like this | Tag-similarity recommender on programme pages, with the shared topics shown | Free |
| Suggested for you | Same recommender on /programmes, from pinned and opened programmes; stays on the device | Free |
| Optional free LLM | If `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` are set, questions the rules can't answer go to any OpenAI-compatible endpoint (Groq free tier, Gemini's OpenAI-compatible endpoint, OpenRouter free models, or local Ollama). It sees only the closest verified records, must say UNSURE if they don't answer, and its reply is labelled as AI-written | Free tier |

Without the three variables everything still works. Tested with a mock endpoint (answer shown and labelled; off = handoff to admissions).
