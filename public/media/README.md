# Media drop folder

Run **`npm run media:status`** for the live checklist: every file the site expects, its exact path and spec, and
✓/✗ for what's already here. Drop files at those paths and rebuild — placeholders switch to the real media
automatically, no code changes.

Until a file exists the site shows a neutral gradient labelled "PHOTO TODO" / "VIDEO TODO".
**Never use stock photos or photos of other campuses.**

## Formats
- Photos: JPG (or WebP/PNG/AVIF with the same name) at the largest size you have — next/image makes the small versions.
- Video: H.264 MP4, muted for background loops; anything with speech needs a `.vtt` caption file with the same name.
- People: only with consent; alumni portraits need written permission.

## Camber Racing scroll scene
Supply one short video of the car (4–8 s turntable spin or slow drive-by, steady camera, car centred), then:

```
scripts/make-sequence.sh path/to/camber.mp4        # → public/media/camber/sequence/{lg,sm}/frame-0001.webp …
```
Uses WebP if your ffmpeg has libwebp (`brew install ffmpeg`), otherwise JPEG.
