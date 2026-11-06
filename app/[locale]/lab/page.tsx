import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { GrailChapter, GrailHero, GrailPage } from "@/components/grail/GrailPage";
import { AbResults } from "@/components/ui/AbResults";
import { EXPERIMENTS } from "@/lib/ab";
import { MIN_VIEWS } from "@/lib/ab-stats";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "A/B lab — SRMIST", robots: { index: false, follow: false } };

/**
 * The team's A/B lab (not linked from the site, not indexed): what each experiment tests, buttons to see either
 * variant, and the live counts from /api/ab with a significance test.
 */
export default async function LabPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === "en" ? "" : `/${locale}`;
  const where: Record<string, string> = { "hero-cta": `${base}/`, "programme-cta": `${base}/programmes/btech-cse` };
  return (
    <GrailPage>
      <GrailHero
        kicker="Team tools"
        title="A/B lab"
        lead={
          <p>
            Each visitor gets variant A or B of every experiment at random, kept on their device. Both variants are in the page, so it stays fast and
            nothing flickers. A result is called only when both variants have at least {MIN_VIEWS} views and the difference is significant (p &lt; 0.05).
          </p>
        }
      />
      <GrailChapter tone="light" kicker="Experiments" level={2} title="What we are testing" titleId="lab-exps">
        <ul className="grid gap-6 lg:grid-cols-2">
          {Object.entries(EXPERIMENTS).map(([id, x]) => (
            <li key={id} className="grail-paper flex flex-col gap-3 p-6">
              <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{id}</p>
              <h3 className="text-2xl font-bold">{x.question}</h3>
              <p>
                <b>A:</b> {x.a}
              </p>
              <p>
                <b>B:</b> {x.b}
              </p>
              <p className="text-fg-muted">
                <b>Goal:</b> {x.goal}
              </p>
              <p className="flex flex-wrap gap-3">
                {x.variants.map((v) => (
                  <a key={v} href={`${where[id]}?ab=${id}:${v}`} className="inline-flex min-h-11 items-center rounded-full border border-current px-5 font-semibold no-underline">
                    See variant {v.toUpperCase()}
                  </a>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </GrailChapter>
      <GrailChapter kicker="Live" level={3} title="Results so far" titleId="lab-results">
        <AbResults />
      </GrailChapter>
    </GrailPage>
  );
}
