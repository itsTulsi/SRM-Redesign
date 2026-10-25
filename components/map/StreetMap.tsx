/**
 * Street map around a campus: a pre-rendered OpenStreetMap image (scripts/build-street-maps.mts), dark-styled
 * with CSS, pin at the centre. No iframe, no JS, no WebGL — instant on low-end phones and fine in Lite Mode.
 * "Open in OpenStreetMap" / "Get directions" lead to the interactive maps.
 */
export function StreetMap({
  image,
  link,
  alt,
  linkLabel,
  approx = false,
  className = "",
}: {
  image: string;
  link: string;
  alt: string;
  linkLabel: string;
  /** Town-level location: show an area ring instead of a precise pin. */
  approx?: boolean;
  className?: string;
}) {
  return (
    <figure className={`flex flex-col gap-2 ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line-subtle bg-[#10245e]">
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static JPG; next/image adds nothing here */}
        <img src={image} alt={alt} width={800} height={600} loading="lazy" decoding="async" className="street-map size-full object-cover" />
        <span
          aria-hidden="true"
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            approx ? "size-24 border-2 border-dashed border-action bg-action/10" : "size-5 border-[3px] border-ink bg-action shadow-[0_0_0_6px_rgb(198_244_50/0.35)]"
          }`}
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>© OpenStreetMap contributors</span>
        <a href={link} className="text-sm">
          {linkLabel}
        </a>
      </figcaption>
    </figure>
  );
}
