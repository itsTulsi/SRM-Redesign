import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getContent } from "./content";
import { findMedia } from "./media";
import { generateTree } from "./tree";

/**
 * Link-preview images (Open Graph / X) for WhatsApp, X and LinkedIn: 1200 × 630, built at build time.
 * Text is always English: the image renderer (Satori) can't shape Tamil or Devanagari, and a broken script is worse
 * than English. Each page's og:title and og:description stay in the page's own language. Facts come from content
 * JSON only; anything still TODO is left off, never printed.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const ogContent = () => getContent("en");

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel));
const dataUrl = (rel: string, type: string) => `data:${type};base64,${read(rel).toString("base64")}`;

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[] | null = null;
// next/font serves woff2, which Satori can't read: these are the same faces as TTF (assets/og-fonts, OFL).
const loadFonts = () =>
  (fonts ??= [
    { name: "Space Grotesk", data: read("assets/og-fonts/SpaceGrotesk-700.ttf"), weight: 700, style: "normal" },
    { name: "Inter", data: read("assets/og-fonts/Inter-400.ttf"), weight: 400, style: "normal" },
    { name: "Inter", data: read("assets/og-fonts/Inter-600.ttf"), weight: 600, style: "normal" },
  ]);

const COLOR = { bg: "#0B1B4D", fg: "#F5F3EE", muted: "#B4BEDF", line: "#6C7BB0", leaf: "#5FD08F" };

/** The Living Tree, fully grown: the site's own procedural tree, never the SRM emblem. */
function treeImage(): string {
  const tree = generateTree();
  const stroke = (segs: { d: string; width: number }[], color: string) =>
    segs.map((s) => `<path d="${s.d}" fill="none" stroke="${color}" stroke-width="${s.width}" stroke-linecap="round"/>`).join("");
  const leaves = tree.leaves
    .map((l) => `<ellipse cx="${l.cx}" cy="${l.cy}" rx="${l.rx}" ry="${l.ry}" opacity="${l.opacity}" fill="${COLOR.leaf}" transform="rotate(${l.rotate} ${l.cx} ${l.cy})"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tree.viewBox}">${stroke(tree.roots, COLOR.line)}${stroke([...tree.trunk, ...tree.branches], COLOR.leaf)}${leaves}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

let shared: { logo: string; tree: string; aspect: number } | null = null;
const assets = () => {
  if (shared) return shared;
  const [, , w, h] = generateTree().viewBox.split(" ").map(Number);
  shared = { logo: dataUrl("public/brand/srm-logo-white.png", "image/png"), tree: treeImage(), aspect: w! / h! };
  return shared;
};

/** "NIRF 2025 · Engineering #14" for a NIRF category id, or null if SRM has no rank in it. */
export function nirfLine(id: string): string | null {
  const { nirf } = ogContent();
  const rank = nirf.ranks.find((r) => r.id === id);
  return rank ? `NIRF ${nirf.year} · ${rank.label} #${rank.rank}` : null;
}

type Card = {
  eyebrow?: string;
  title: string;
  /** A line under the title, e.g. a story's dek. */
  sub?: string;
  /** The one fact to lead with, e.g. a fee. Omitted when it isn't published. */
  fact?: string | null;
  badges?: (string | null)[];
  /** A photo under public/, shown on the right instead of the tree. */
  photo?: string;
};

const titleSize = (title: string) => (title.length <= 30 ? 76 : title.length <= 52 ? 62 : title.length <= 80 ? 52 : 44);

const photoData = (rel: string | undefined) => {
  const url = findMedia(rel);
  // Satori decodes JPEG and PNG only.
  const type = url?.match(/\.jpe?g$/i) ? "image/jpeg" : url?.endsWith(".png") ? "image/png" : null;
  return url && type ? dataUrl(path.join("public", url), type) : null;
};

export function ogImage({ eyebrow, title, sub, fact, badges = [], photo }: Card): ImageResponse {
  const { logo, tree, aspect } = assets();
  const { naacGrade, site } = ogContent();
  const photoUrl = photoData(photo);
  const pills = [...badges, `NAAC ${naacGrade}`].filter((b): b is string => !!b);
  const treeHeight = 600;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: COLOR.bg, color: COLOR.fg, fontFamily: "Inter" }}>
        {photoUrl ? (
          // A square, not a full-height strip: PNG stores every photo pixel, and WhatsApp drops previews over ~300 KB.
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img src={photoUrl} alt="" style={{ position: "absolute", top: 175, right: 72, width: 280, height: 280, objectFit: "cover", borderRadius: 26 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img src={tree} alt="" style={{ position: "absolute", right: 30, bottom: 6, height: treeHeight, width: treeHeight * aspect, opacity: 0.5 }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 960,
            height: "100%",
            padding: "56px 0 56px 72px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={logo} alt="" style={{ height: 58, width: 171 }} />
          {/* Narrower beside a photo; the footer below keeps the full width so its badges never wrap. */}
          <div style={{ display: "flex", flexDirection: "column", width: photoUrl ? 680 : 830 }}>
            {eyebrow ? <div style={{ fontSize: 26, fontWeight: 600, color: COLOR.muted, marginBottom: 18 }}>{eyebrow}</div> : null}
            <div style={{ fontFamily: "Space Grotesk", fontSize: titleSize(title), lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
            {sub ? <div style={{ fontSize: 28, color: COLOR.muted, marginTop: 22, lineHeight: 1.35 }}>{sub}</div> : null}
            {fact ? <div style={{ fontSize: 36, fontWeight: 600, color: COLOR.leaf, marginTop: 26 }}>{fact}</div> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 28, marginRight: 10, whiteSpace: "nowrap" }}>{site.tagline}</div>
            {pills.map((p) => (
              <div key={p} style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", fontSize: 22, fontWeight: 600, padding: "8px 16px", border: `2px solid ${COLOR.line}`, borderRadius: 999 }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: loadFonts() },
  );
}
