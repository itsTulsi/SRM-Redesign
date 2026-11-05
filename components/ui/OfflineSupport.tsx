"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { afterLoadIdle } from "@/lib/after-load";

/** Scripts, styles and the search index this page has already fetched. */
export const loadedAssets = () =>
  performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((u) => u.startsWith(location.origin) && /\/_next\/static\/|\/api\/search-index\//.test(u));

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/**
 * Registers the service worker (public/sw.js) in production builds only, after load and idle so it never competes
 * with the first paint, and shows a slim banner while the device is offline. In development any old worker is
 * removed, so `npm run dev` never serves stale pages.
 */
export function OfflineSupport() {
  const t = useTranslations("Offline");
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    return afterLoadIdle(async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller)
          await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
        // Hand the worker what this page loaded before it was in charge, so it works offline too.
        navigator.serviceWorker.controller?.postMessage({ type: "warm", assets: loadedAssets() });
        // The two panels load on demand; fetch them now (through the worker) so they still open offline.
        import("@/components/assistant/AssistantPanel").catch(() => {});
        import("@/components/nav/CommandPanel").catch(() => {});
      } catch {
        // No worker (private mode, unsupported): the site works as before, online.
      }
    });
  }, []);

  // Always in the page, so screen readers hear it appear; it overlays the top of the page instead of pushing it down.
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      {online ? null : <p className="mt-2 rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lg">{t("banner")}</p>}
    </div>
  );
}
