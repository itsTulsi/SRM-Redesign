import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { HeroVideo } from "./HeroVideo";

// Checked at build time: drop files into public/media/hero/ and rebuild — no code change needed.
const has = (rel: string) => existsSync(path.join(process.cwd(), "public", rel));

export function HeroMedia() {
  const poster = ["media/hero/poster.jpg", "media/hero/poster.webp"].find(has);
  const sources = [
    { src: "/media/hero/campus-loop.webm", type: "video/webm" },
    { src: "/media/hero/campus-loop.mp4", type: "video/mp4" },
  ].filter((s) => has(s.src.slice(1)));

  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {poster ? (
          <Image src={`/${poster}`} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : (
          <MediaPlaceholder
            decorative
            kind="video"
            description="Muted campus loop, first frame as poster"
            file="media/hero/campus-loop.mp4 + poster.jpg"
            labelPosition="top-right"
            className="size-full"
          />
        )}
      </div>
      {poster && sources.length > 0 ? <HeroVideo sources={sources} poster={`/${poster}`} /> : null}
      {/* Contrast scrim, last in DOM so it sits above poster AND video: hero text stays ≥ 4.5:1. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-srm-blue-900 via-srm-blue-900/80 to-srm-blue-900/50"
      />
    </>
  );
}
