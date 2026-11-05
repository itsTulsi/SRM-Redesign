/**
 * Programmes pinned for comparison: up to three slugs, kept on this device (no login). The comparison itself is a
 * plain server page, /compare?p=a&p=b, so any comparison is a link that can be shared and works without JavaScript.
 */
const STORAGE_KEY = "srm-compare";
export const MAX_COMPARE = 3;

const listeners = new Set<() => void>();
let snapshot: string | null = null;

function load(): string {
  if (snapshot !== null) return snapshot;
  try {
    snapshot = localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Storage blocked: pins last for this page view only.
    snapshot = "";
  }
  return snapshot;
}

function save(slugs: string[]): void {
  snapshot = slugs.join(",");
  try {
    localStorage.setItem(STORAGE_KEY, snapshot);
  } catch {
    // Storage blocked: see load().
  }
  listeners.forEach((fn) => fn());
}

export const parseCompare = (value: string) => (value ? value.split(",") : []);
export const readCompareSnapshot = () => load();
export const serverCompareSnapshot = () => "";

export function subscribeCompare(onChange: () => void): () => void {
  // Keeps other open tabs in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    snapshot = null;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleCompare(slug: string): void {
  const slugs = parseCompare(load());
  if (slugs.includes(slug)) save(slugs.filter((s) => s !== slug));
  else if (slugs.length < MAX_COMPARE) save([...slugs, slug]);
}

export const clearCompare = () => save([]);

export const compareHref = (slugs: string[], extra = "") =>
  `/compare?${slugs.map((s) => `p=${encodeURIComponent(s)}`).join("&")}${extra}`;
