import { getTranslations } from "next-intl/server";
import { Photo } from "@/components/ui/Photo";
import { telHref, type HostelBlock } from "@/lib/hostels";
import { findMedia } from "@/lib/media";

/** One hostel block: photo (or a name tile when SRM has none), room facts, extras and the warden's contacts. */
export async function BlockCard({ block }: { block: HostelBlock }) {
  const t = await getTranslations("Hostels");
  const facts = [
    block.ac ? t(`block.${block.ac}`) : null,
    block.washroom ? t(`block.washroom.${block.washroom}`) : null,
    block.sharing ? t("block.sharing", { n: block.sharing }) : null,
    block.floors ? t("block.floors", { n: block.floors }) : null,
    block.offCampus ? t("block.offCampus") : null,
  ].filter(Boolean);

  return (
    <li className="grail-paper flex flex-col overflow-hidden">
      {findMedia(block.photo) ? (
        <Photo src={block.photo} alt={t("block.photoAlt", { name: block.name })} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] w-full" />
      ) : (
        <div aria-hidden="true" className="grid aspect-[4/3] w-full place-items-center bg-[radial-gradient(90%_90%_at_30%_20%,var(--srm-blue-500),var(--srm-blue-900))] px-6 text-center font-display text-3xl font-bold text-paper/85">
          {block.name}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-xl font-bold">{block.name}</h3>
        {facts.length ? <p className="text-sm text-fg-muted">{facts.join(" · ")}</p> : null}
        {block.extras?.length ? (
          <ul className="flex flex-wrap gap-2">
            {block.extras.map((x) => (
              <li key={x} className="rounded-full border border-line-subtle px-3 py-1 text-xs">
                {t(`block.extras.${x}`)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-col pt-2 text-sm">
          <span className="text-fg-muted">{t("block.warden")}</span>
          <a href={`mailto:${block.email}`} className="inline-flex min-h-11 items-center break-all">
            {block.email}
          </a>
          <a href={telHref(block.phone)} className="inline-flex min-h-11 items-center font-semibold">
            {block.phone}
          </a>
          {block.phoneAlt ? (
            <a href={telHref(block.phoneAlt)} className="inline-flex min-h-11 items-center font-semibold">
              {block.phoneAlt}
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}
