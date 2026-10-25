"use client";

import { useEffect } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import { usePathname } from "@/lib/i18n";
import { motionAllowed } from "@/lib/motion";

/**
 * Loads the GSAP/Lenis choreography (lib/motion-scenes) lazily, after the page is idle, and only when motion
 * is allowed. Re-runs on route change; tears everything down if Lite Mode or reduced motion switches on.
 * Nothing here is in the initial bundle.
 */
export function MotionDirector() {
  const { reducedMotion } = useLiteMode();
  const pathname = usePathname();

  useEffect(() => {
    // Read the live attribute, not the server snapshot used during hydration.
    if (reducedMotion || !motionAllowed()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      import("@/lib/motion-scenes").then(({ startMotion }) => {
        if (!cancelled && motionAllowed()) stop = startMotion();
      });
    });
    return () => {
      cancelled = true;
      cancelIdle(handle);
      stop?.();
    };
  }, [reducedMotion, pathname]);

  return null;
}
