import { getLocale, getTranslations } from "next-intl/server";
import { getContent } from "@/lib/content";
import { findMedia } from "@/lib/media";
import { SECTION } from "@/lib/sections";
import { VoiceCard } from "./VoiceCard";

/** SRM's "Legacy Beyond Curriculum": India's science leaders on campus, as tap-to-play YouTube Shorts. */
export async function Voices() {
  const t = await getTranslations("Acts.lead");
  const { voices } = getContent(await getLocale());

  return (
    <div id={SECTION.voices} className="site-container pb-20 lg:pb-32">
      <h3 className="font-display text-section font-bold">{t("voicesTitle")}</h3>
      <p className="mt-3 max-w-prose text-fg-muted">{t("voicesIntro")}</p>
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
        {voices.map((v) => (
          <li key={v.slug} className="flex flex-col gap-3">
            <div className="aspect-[9/16] overflow-hidden rounded-3xl bg-ink">
              <VoiceCard youtubeId={v.youtubeId} title={v.title} poster={findMedia(`media/voices/${v.youtubeId}.jpg`)} playLabel={t("play")} />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold sm:text-xl">{v.name}</h4>
              <p className="mt-1 text-sm text-fg-muted">{v.role}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-fg-muted">{t("voicesNote")}</p>
    </div>
  );
}
