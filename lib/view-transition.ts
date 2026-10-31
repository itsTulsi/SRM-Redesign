import { motionAllowed } from "./motion";

/**
 * Page transitions with the browser's own View Transitions API (no library, nothing to download). The browser holds
 * the old page as a picture until the new route has committed; a slow network gives up after MAX_WAIT and lets the
 * page change without the animation. Off under reduced motion / Lite Mode and in browsers without the API.
 */
const MAX_WAIT = 1000;
let settle: (() => void) | null = null;

/** Called when the route has committed. Waits two frames so Next has also reset the scroll position. */
export function routeCommitted(): void {
  const done = settle;
  settle = null;
  if (done) requestAnimationFrame(() => requestAnimationFrame(done));
}

export function withViewTransition(navigate: () => void): void {
  if (!document.startViewTransition || !motionAllowed()) return navigate();
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        settle = resolve;
        navigate();
        window.setTimeout(() => {
          if (settle === resolve) settle = null;
          resolve();
        }, MAX_WAIT);
      }),
  );
}

/** Pairs a programme's title across pages, so a card's title grows into the programme page's heading. */
export const programmeTitleName = (slug: string) => ({ viewTransitionName: `programme-${slug}` });
