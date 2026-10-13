"use client";

import { useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";

/**
 * Copies text and flips `copied` on for `resetMs`. `copy` resolves to whether
 * the clipboard write succeeded.
 */
export function useCopyFeedback(resetMs: number) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = async (text: string) => {
    try {
      await copyTextToClipboard(text);
    } catch {
      return false;
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), resetMs);
    return true;
  };

  return { copied, copy };
}
