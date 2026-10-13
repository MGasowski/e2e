"use client";

import { useSyncExternalStore } from "react";

/**
 * The code tab a reader last picked (`pnpm`), shared by every code group on
 * the site and kept across pages and visits, as Mintlify does: a group that
 * has a tab with that label shows it.
 */
const KEY = "e2e-docs-code-tab";
const EVENT = "e2e-docs-code-tab";

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCodeTabChoice() {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function chooseCodeTab(label: string) {
  try {
    localStorage.setItem(KEY, label);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
