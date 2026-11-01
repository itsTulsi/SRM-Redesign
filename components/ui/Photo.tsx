import Image from "next/image";
import mediaCredits from "@/content/media-credits.json";
import { findMedia } from "@/lib/media";
import { MediaPlaceholder } from "./MediaPlaceholder";

type Credit = { author?: string; license?: string; source: string };
const CREDITS: Record<string, Credit> = mediaCredits.credits;

type Props = {
  /** Path under public/, as named in content JSON (e.g. "media/campuses/ramapuram.jpg"). */
  src: string | undefined;
  /** Real alt text. Use "" only for purely decorative images. */
  alt: string;
  /** next/image sizes hint, e.g. "(min-width: 1024px) 33vw, 100vw". */
  sizes: string;
  /** Sizing + aspect classes for the frame, e.g. "aspect-[4/3] w-full rounded-3xl". */
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Background image: empty alt, placeholder hidden from assistive tech. */
  decorative?: boolean;
};

/** The real photo if the team has supplied it, otherwise the labelled "PHOTO TODO" placeholder. */
export function Photo({ src, alt, sizes, className = "", imgClassName = "", priority = false, decorative = false }: Props) {
  const url = findMedia(src);
  if (!url)
    return <MediaPlaceholder description={alt || "Decorative photo"} file={src} decorative={decorative} className={className} />;
  // Openly licensed photos (CC BY / BY-SA) must show their author and licence wherever they appear.
  const credit = src ? CREDITS[src] : undefined;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={url} alt={decorative ? "" : alt} fill sizes={sizes} priority={priority} className={`object-cover ${imgClassName}`} />
      {credit?.license ? (
        <a
          href={credit.source}
          lang="en"
          className="absolute right-2 bottom-2 inline-flex min-h-6 items-center rounded-md bg-bg/85 px-2 text-xs text-fg no-underline hover:underline"
        >
          Photo: {credit.author}, {credit.license}
        </a>
      ) : null}
    </div>
  );
}
