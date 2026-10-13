"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";

/** Copies text and reports `copied` for a moment after, for a check mark. */
export function useCopy(resetAfter = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text: string | (() => string | Promise<string>)) => {
      try {
        await copyTextToClipboard(typeof text === "function" ? await text() : text);
      } catch {
        return;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetAfter);
    },
    [resetAfter],
  );
  return { copied, copy };
}
