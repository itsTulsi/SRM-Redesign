"use client";

import { useEffect } from "react";
import { useLiteMode } from "@/components/ui/use-lite-mode";
import { usePathname } from "@/lib/i18n";
import { afterLoadIdle } from "@/lib/after-load";
import { motionAllowed } from "@/lib/motion";

/**
 * Loads the GSAP/Lenis choreography (lib/motion-scenes) lazily, after load + idle, and only when motion
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
    // After load + idle: the ~50 kB motion layer never competes with first paint or LCP.
    const cancelSchedule = afterLoadIdle(() => {
      import("@/lib/motion-scenes").then(({ startMotion }) => {
        if (!cancelled && motionAllowed()) stop = startMotion();
      });
    });
    return () => {
      cancelled = true;
      cancelSchedule();
      stop?.();
    };
  }, [reducedMotion, pathname]);

  return null;
}
