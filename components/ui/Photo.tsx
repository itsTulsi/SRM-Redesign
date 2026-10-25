import Image from "next/image";
import { findMedia } from "@/lib/media";
import { MediaPlaceholder } from "./MediaPlaceholder";

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
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={url} alt={decorative ? "" : alt} fill sizes={sizes} priority={priority} className={`object-cover ${imgClassName}`} />
    </div>
  );
}
