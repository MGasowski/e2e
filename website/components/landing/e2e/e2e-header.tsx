import Image from "next/image";
import Link from "next/link";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { cn } from "@/lib/utils";
import { E2eMobileMenu } from "./e2e-mobile-menu";
import { GithubStarsButton } from "./github-stars-button";
import { E2E_DOCS_URL, TESTER_ARMY_URL } from "./links";
import { E2E_OUTLINE_BUTTON } from "./outline-button";

export function E2eHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 px-6 pt-6 sm:px-10">
      <div className="relative mx-auto flex h-9 max-w-[1200px] items-center justify-between">
        <nav aria-label="Brand navigation" className="flex items-center gap-2.5 sm:gap-3">
          <a href={TESTER_ARMY_URL} aria-label="TesterArmy home" className="flex items-center">
            <Image
              src="/e2e/logo-white.png"
              alt="TesterArmy"
              width={168}
              height={168}
              sizes="32px"
              priority
              className="size-8 object-contain"
            />
          </a>
          <span
            aria-hidden="true"
            className="font-mono text-[26px] leading-none tracking-[-0.06em] sm:text-[30px]"
          >
            /
          </span>
          <Link
            href="/e2e"
            aria-label="e2e home"
            className="type-h2 flex items-center text-[26px] leading-none tracking-[-0.06em] text-ta-sand-50 sm:text-[30px]"
          >
            e2e
          </Link>
        </nav>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/e2e/sessions"
            className="hidden font-mono text-base uppercase text-white/90 transition-colors hover:text-white sm:block"
          >
            sessions
          </Link>
          <a
            href={E2E_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden font-mono text-base uppercase text-white/90 transition-colors hover:text-white sm:block"
          >
            docs
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/discord"
              target="_blank"
              rel="noreferrer"
              className={cn(
                E2E_OUTLINE_BUTTON,
                "hidden h-9 items-center gap-2 whitespace-nowrap px-3.5 text-sm sm:flex",
              )}
            >
              <DiscordIcon aria-hidden="true" className="size-4" />
              Join community
            </a>
            <GithubStarsButton />
          </div>
          <E2eMobileMenu />
        </div>
      </div>
    </header>
  );
}
