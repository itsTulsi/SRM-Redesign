# Fonts for link-preview images

`lib/og.tsx` draws the Open Graph / X preview images with Satori (`next/og`), which can't read the woff2 files
`next/font` serves. These are the same faces as TTF, from Google Fonts:

| File | Family | Licence |
|---|---|---|
| `SpaceGrotesk-700.ttf` | Space Grotesk Bold | SIL Open Font License 1.1 (`OFL-SpaceGrotesk.txt`) |
| `Inter-400.ttf`, `Inter-600.ttf` | Inter Regular and SemiBold | SIL Open Font License 1.1 (`OFL-Inter.txt`) |

They are used only at build time, to draw the images, and are never sent to visitors.
