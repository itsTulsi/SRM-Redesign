# Credits

Third-party fonts and assets used on the `feature/grail-redesign` branch ("Level Up at SRM").

## Fonts

All are self-hosted at build time through `next/font`; nothing is requested from Google at runtime.

| Font | Use | Licence |
|---|---|---|
| [Gloock](https://fonts.google.com/specimen/Gloock) | Display headlines | SIL Open Font License 1.1 |
| [Inter](https://fonts.google.com/specimen/Inter) | Text | SIL Open Font License 1.1 |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | Display on the other pages | SIL Open Font License 1.1 |
| [Noto Sans Tamil](https://fonts.google.com/noto/specimen/Noto+Sans+Tamil), [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari) | Tamil and Hindi | SIL Open Font License 1.1 |

The link-preview images use TTF copies of Space Grotesk and Inter; see `assets/og-fonts/README.md`.

## Art and reference

- **Kolam crests** (`lib/kolam.ts`) are generated line drawings after the kolam floor drawings of Tamil Nadu. They are
  original to this project, not traced from any source.
- **Structure and feel** are borrowed from [grail-app.com](https://grail-app.com/), as the brief asks
  (`REFERENCE.md`). None of Grail's copy, logo, illustrations, fonts or code is used.
- **Photos** are SRM's own, plus openly licensed photos from Wikimedia Commons, which show their author and licence on
  the image. Every file's origin is listed in `content/media-credits.json`.

## 3D hostel finder (/hostels)

- Building footprints, roads and water: © OpenStreetMap contributors, available under the Open Database Licence
  (https://www.openstreetmap.org/copyright). Rebuilt with `scripts/build-campus-3d.mjs`. Heights are approximate.
- three.js (MIT), React Three Fiber and drei (MIT).

## Homepage

- The ink-blot mask (`public/brand/ink-blot.svg`) is original. The "clock" digits are the live time in Chennai.
