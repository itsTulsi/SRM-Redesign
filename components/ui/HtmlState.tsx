"use client";

import { useLayoutEffect } from "react";
import { applyLiteMode, LITE_STORAGE_KEY } from "@/lib/lite-mode";
import { applyParentMode, PARENT_STORAGE_KEY } from "@/lib/parent-mode";

/**
 * Changing language swaps the root layout, and React's new <html> has none of the data-* flags the head script set
 * (a script added by React doesn't run). Put them back, or Lite Mode, Parent Mode and motion all stop until a reload.
 */
export function HtmlState() {
  useLayoutEffect(() => {
    applyLiteMode(LITE_STORAGE_KEY);
    applyParentMode(PARENT_STORAGE_KEY);
  }, []);
  return null;
}
