"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons/close-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { MenuIcon } from "@/components/icons/menu-icon";
import { E2E_DOCS_URL } from "./links";

export function E2eMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="relative z-50 -mr-[7px] flex size-9 cursor-pointer items-center justify-center text-ta-sand-50"
      >
        {open ? (
          <CloseIcon className="size-[22px]" strokeWidth={1.6} />
        ) : (
          <MenuIcon className="size-[22px]" strokeWidth={1.6} />
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute inset-x-0 top-full z-50 mt-4 flex flex-col divide-y divide-white/15 bg-[rgb(22_22_22/0.95)] inset-ring-[0.5px] inset-ring-white/80">
            <a
              href={E2E_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="flex h-12 items-center px-4 font-mono text-sm uppercase text-white/90 transition-colors hover:text-white"
            >
              docs
            </a>
            <a
              href="/discord"
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="flex h-12 items-center gap-2 px-4 font-mono text-sm uppercase text-white/90 transition-colors hover:text-white"
            >
              <DiscordIcon aria-hidden="true" className="size-4" />
              Join community
            </a>
          </div>
        </>
      )}
    </div>
  );
}
