"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { routeCommitted, withViewTransition } from "@/lib/view-transition";

/**
 * Runs every internal page change through a view transition. One listener on the document instead of a wrapper around
 * each link: it only calls preventDefault, which makes Next's <Link> stand aside, so links' own click handlers still run.
 */
export function ViewTransitions() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => routeCommitted(), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
      const link = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      // Same page (anchors, ?p= changes), other sites, and files keep their normal behaviour.
      if (url.origin !== location.origin || url.pathname === location.pathname || /\.\w+$/.test(url.pathname)) return;
      e.preventDefault();
      withViewTransition(() => router.push(url.pathname + url.search + url.hash));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
