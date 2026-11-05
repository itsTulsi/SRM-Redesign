/**
 * App icons for the web app manifest (app/manifest.ts), drawn from app/icon.svg. Run once after changing the icon:
 *   npx tsx scripts/build-icons.mts
 * Uses sharp, which Next.js already installs for image optimisation, so it isn't a dependency of its own.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const svg = readFileSync(join(root, "app/icon.svg"));
const out = (name: string) => join(root, "public/icons", name);

for (const size of [192, 512]) {
  await sharp(svg, { density: 512 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out(`icon-${size}.png`));
}
// Maskable: the launcher may crop to any shape, so the mark sits inside the central 80% on the brand blue.
const inner = Math.round(512 * 0.72);
const mark = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0b1b4d" } })
  .composite([{ input: mark, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(out("maskable-512.png"));
console.log("public/icons: icon-192.png, icon-512.png, maskable-512.png");
