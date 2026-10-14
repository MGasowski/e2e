"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { onMenuKeyDown, useDismiss } from "./use-dismiss";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const EVENT = "e2e-docs-theme";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Puts `.dark` on the root as the layout's inline script does before the first paint. */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

/** Light, dark, or the system's choice; `localStorage.theme` keeps it. */
export function ThemeMenu({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  useEffect(() => {
    if (theme !== "system") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [theme]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Change theme preference"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="docs-icon-button"
      >
        {/* The chosen preference, as Mintlify shows it: a sun, a moon, or the system's screen. */}
        {theme === "light" && <Sun aria-hidden="true" className="size-4" strokeWidth={1.6} />}
        {theme === "dark" && <Moon aria-hidden="true" className="size-4" strokeWidth={1.6} />}
        {theme === "system" && <Monitor aria-hidden="true" className="size-4" strokeWidth={1.6} />}
      </button>
      {open && (
        <div role="menu" aria-label="Theme" className="docs-menu docs-theme-menu right-0 w-32" onKeyDown={onMenuKeyDown}>
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className="docs-menu-item"
              onClick={() => {
                setTheme(value);
                close();
              }}
            >
              <Icon aria-hidden="true" className="size-4" strokeWidth={1.6} />
              <span className="flex-1">{label}</span>
              {theme === value && <Check aria-hidden="true" className="size-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The three choices side by side, as Mintlify's navigation drawer shows them. */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  return (
    <div role="group" aria-label="Theme" className="docs-theme-switch">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" aria-label={label} aria-pressed={theme === value} onClick={() => setTheme(value)}>
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}
