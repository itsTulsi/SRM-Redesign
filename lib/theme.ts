/**
 * Theme: follows prefers-color-scheme unless the visitor picks one (toggle lives in the footer).
 * Homepage acts are dark by default via [data-surface="dark"]; only an explicit "light" choice overrides them.
 *
 *   <html data-theme="light" | "dark">   — only present when the visitor chose explicitly
 */

export const THEME_STORAGE_KEY = "srm-theme";

export type ThemeChoice = "light" | "dark" | null;

/** Runs inline in <head> before first paint. Must stay self-contained. */
export function applyTheme(storageKey: string): void {
  let choice: string | null = null;
  try {
    choice = localStorage.getItem(storageKey);
  } catch {
    // Storage blocked — follow the system preference.
  }
  if (choice === "light" || choice === "dark") document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme;
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === null) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked — applies to this page view only.
  }
  if (choice === null) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
}
