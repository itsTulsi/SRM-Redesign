"use client";

import { useSyncExternalStore } from "react";
import { setTheme, type ThemeChoice } from "@/lib/theme";

type Labels = { legend: string; system: string; light: string; dark: string };

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const read = () => document.documentElement.dataset.theme ?? "system";

/** Native radios: correct semantics and arrow-key behaviour for free. */
export function ThemeToggle({ labels }: { labels: Labels }) {
  const current = useSyncExternalStore(subscribe, read, () => "system");
  const options = [
    { value: "system", label: labels.system },
    { value: "light", label: labels.light },
    { value: "dark", label: labels.dark },
  ] as const;

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{labels.legend}</legend>
      <span aria-hidden="true" className="mr-1 text-sm text-fg-muted">
        {labels.legend}
      </span>
      {options.map((o) => (
        <label
          key={o.value}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm has-[:checked]:bg-fg has-[:checked]:font-semibold has-[:checked]:text-bg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus"
        >
          <input
            type="radio"
            name="theme"
            value={o.value}
            checked={current === o.value}
            onChange={() => setTheme(o.value === "system" ? null : (o.value as ThemeChoice))}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
