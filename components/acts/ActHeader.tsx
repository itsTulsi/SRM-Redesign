type Props = {
  id: string;
  kicker: string;
  /** Translated act word, shown beside the English title in ta/hi. */
  word: string;
  /** Always English: LEARN / LEAP / LEAD is SRM's tagline, not copy to translate. */
  title: "Learn" | "Leap" | "Lead";
  question: string;
  locale: string;
};

/** Act opener: giant title (motion assembles it from fragments in step 7) + question-led line (SOAS). */
export function ActHeader({ id, kicker, word, title, question, locale }: Props) {
  return (
    <header className="site-container pt-24 pb-12 lg:pt-40 lg:pb-20">
      <p className="text-sm font-semibold tracking-[0.2em] text-fg-muted uppercase">
        {kicker}
        {locale !== "en" ? <span> · {word}</span> : null}
      </p>
      <h2 id={id} lang="en" data-act-title className="mt-2 font-display text-act font-bold uppercase">
        {title}
      </h2>
      <p className="mt-6 max-w-[22ch] font-display text-section font-medium text-balance">{question}</p>
    </header>
  );
}
