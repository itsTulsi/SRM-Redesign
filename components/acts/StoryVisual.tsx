import { Photo } from "@/components/ui/Photo";
import type { Story } from "@/lib/content";
import { findMedia } from "@/lib/media";

/**
 * A story's picture: the real photo when the team has supplied one; otherwise, for stories with no photo to be had
 * (e.g. a startup known only by its name), a typographic poster in the site's own colours — an original design,
 * not the company's logo. Without either, the usual labelled placeholder.
 */
export function StoryVisual({ story, sizes, className, priority = false }: { story: Story; sizes: string; className: string; priority?: boolean }) {
  const poster = story.media.poster;
  if (findMedia(story.media.photo) || !poster) {
    return <Photo reveal src={story.media.photo} alt={story.title} sizes={sizes} priority={priority} className={className} />;
  }
  // Decorative: the story's heading sits right beside it and says the same thing.
  return (
    <div
      aria-hidden="true"
      className={`relative isolate flex flex-col justify-end overflow-hidden bg-srm-blue-900 p-6 sm:p-10 ${className}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_85%_10%,var(--srm-blue-500)_0%,transparent_60%)] opacity-70" />
      <svg viewBox="0 0 400 250" className="absolute top-[8%] right-[6%] -z-10 w-[44%] text-paper sm:w-[62%]" fill="none">
        {/* flight path */}
        <path d="M10 220 C 120 210, 150 120, 250 110 S 360 60, 372 34" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
        {/* paper plane */}
        <g transform="translate(330 8) rotate(-12)">
          <path d="M0 26 L64 0 L46 58 L30 40 Z" fill="currentColor" />
          <path d="M30 40 L64 0 L24 34 Z" fill="currentColor" fillOpacity=".55" />
          <path d="M30 40 L34 56 L24 34 Z" fill="currentColor" fillOpacity=".75" />
        </g>
        {/* chat bubbles */}
        <rect x="40" y="70" width="130" height="44" rx="22" fill="var(--leaf-green-300)" fillOpacity=".9" />
        <path d="M58 112 L52 128 L76 112 Z" fill="var(--leaf-green-300)" fillOpacity=".9" />
        <rect x="58" y="86" width="72" height="6" rx="3" fill="var(--srm-blue-900)" fillOpacity=".55" />
        <rect x="58" y="98" width="46" height="6" rx="3" fill="var(--srm-blue-900)" fillOpacity=".35" />
        <rect x="150" y="140" width="110" height="38" rx="19" fill="currentColor" fillOpacity=".14" />
        <rect x="168" y="155" width="70" height="6" rx="3" fill="currentColor" fillOpacity=".4" />
      </svg>
      <p className="font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.9] font-bold tracking-tight text-paper">{poster.name}</p>
      <p className="mt-3 max-w-md text-lg text-paper/80">{poster.tagline}</p>
    </div>
  );
}
