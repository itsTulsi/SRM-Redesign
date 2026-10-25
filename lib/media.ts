import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Build-time media lookup (server only). Content JSON names the file it expects (e.g. "media/colleges/law.jpg");
 * if the team has dropped that file — or the same name with another image extension — into public/, we use it.
 * Otherwise components fall back to the labelled placeholder. No code change is needed when media arrives.
 */
const PUBLIC = path.join(process.cwd(), "public");
const IMAGE_EXTS = [".jpg", ".jpeg", ".webp", ".avif", ".png"];

/** "/media/…" URL of the real file, or null if it hasn't been supplied yet. */
export function findMedia(rel: string | undefined): string | null {
  if (!rel) return null;
  if (existsSync(path.join(PUBLIC, rel))) return `/${rel}`;
  const ext = path.extname(rel);
  if (!IMAGE_EXTS.includes(ext.toLowerCase())) return null;
  const base = rel.slice(0, -ext.length);
  for (const alt of IMAGE_EXTS) if (existsSync(path.join(PUBLIC, base + alt))) return `/${base + alt}`;
  return null;
}

export type FrameSequence = { count: number; sm: string[]; lg: string[] };

/**
 * Scroll-scrubbed image sequence: public/<dir>/sm/*.{webp,jpg,png,svg} (~720w) and <dir>/lg/* (~1440w),
 * sorted by filename. Produced from one video by scripts/make-sequence.sh. Null if not supplied.
 */
export function findSequence(dir: string | undefined): FrameSequence | null {
  if (!dir) return null;
  const list = (size: "sm" | "lg") => {
    const abs = path.join(PUBLIC, dir, size);
    if (!existsSync(abs)) return [];
    return readdirSync(abs)
      .filter((f) => /\.(webp|jpe?g|png|avif|svg)$/i.test(f))
      .sort()
      .map((f) => `/${dir}/${size}/${f}`);
  };
  const sm = list("sm");
  const lg = list("lg");
  const count = Math.max(sm.length, lg.length);
  if (count < 2) return null;
  // If only one size was supplied, use it for both.
  return { count, sm: sm.length ? sm : lg, lg: lg.length ? lg : sm };
}
