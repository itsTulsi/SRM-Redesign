/**
 * Run non-essential work (motion layer, search warm-up) only after the page has fully loaded AND the browser
 * is idle — so it never competes with first paint / LCP. Returns a cancel function.
 */
export function afterLoadIdle(cb: () => void, timeout = 2000): () => void {
  let cancelled = false;
  let idleHandle: number | undefined;
  const idle = (fn: () => void) =>
    window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout }) : window.setTimeout(fn, 200);
  const cancelIdle = (h: number) => (window.cancelIdleCallback ? window.cancelIdleCallback(h) : window.clearTimeout(h));
  const schedule = () => {
    if (!cancelled) idleHandle = idle(() => !cancelled && cb());
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleHandle !== undefined) cancelIdle(idleHandle);
  };
}
