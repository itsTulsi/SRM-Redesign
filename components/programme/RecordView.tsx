"use client";

import { useEffect } from "react";

/** Remembers, on this device only, which programmes you opened, so the finder can suggest similar ones. */
export function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem("srm-viewed") ?? "[]");
      localStorage.setItem("srm-viewed", JSON.stringify([slug, ...seen.filter((s) => s !== slug)].slice(0, 6)));
    } catch {
      // Storage can be blocked (private windows); suggestions just stay empty.
    }
  }, [slug]);
  return null;
}
