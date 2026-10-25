"use client";

import { useSyncExternalStore } from "react";
import {
  parseLiteSnapshot,
  readLiteSnapshot,
  SERVER_LITE_SNAPSHOT,
  subscribeLiteMode,
  type LiteState,
} from "@/lib/lite-mode";

/** Live Lite Mode state. Server render and first client render assume "off"; real state follows immediately. */
export function useLiteMode(): LiteState {
  const snapshot = useSyncExternalStore(subscribeLiteMode, readLiteSnapshot, () => SERVER_LITE_SNAPSHOT);
  return parseLiteSnapshot(snapshot);
}
