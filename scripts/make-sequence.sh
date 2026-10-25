#!/usr/bin/env bash
# Turn one video of the Camber car (a turntable spin or slow drive-by) into the scroll-scrubbed frame sequence.
#
#   scripts/make-sequence.sh path/to/camber.mp4 [frames=96] [out=public/media/camber/sequence]
#
# Writes <out>/lg/frame-0001.webp … (1440px wide) and <out>/sm/… (720px wide) — or .jpg if this ffmpeg has no
# WebP encoder. Rebuild the site afterwards; the scene picks the frames up automatically.
set -euo pipefail

in="${1:?usage: scripts/make-sequence.sh input.mp4 [frames] [outdir]}"
frames="${2:-96}"
out="${3:-public/media/camber/sequence}"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)"; exit 1; }
duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")"
fps="$(awk -v n="$frames" -v d="$duration" 'BEGIN { printf "%.5f", n / d }')"

if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libwebp; then
  ext=webp; codec=(-c:v libwebp -compression_level 6); qflag=-quality; lgq=70; smq=68
else
  echo "(no libwebp in this ffmpeg — writing JPEG frames instead)"
  ext=jpg; codec=(-c:v mjpeg); qflag=-q:v; lgq=4; smq=5
fi

rm -rf "$out/lg" "$out/sm"
mkdir -p "$out/lg" "$out/sm"
for spec in "lg 1440 $lgq" "sm 720 $smq"; do
  read -r size width quality <<<"$spec"
  ffmpeg -v error -i "$in" -an -vf "fps=$fps,scale=$width:-2:flags=lanczos" \
    -frames:v "$frames" "${codec[@]}" "$qflag" "$quality" "$out/$size/frame-%04d.$ext"
done

lg_count=$(find "$out/lg" -name "*.$ext" | wc -l | tr -d ' ')
echo "✓ $lg_count frames → $out  (lg $(du -sh "$out/lg" | cut -f1), sm $(du -sh "$out/sm" | cut -f1))"
