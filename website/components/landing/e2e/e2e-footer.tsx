import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "./copy-command-button";
import { E2E_DOCS_URL, E2E_GITHUB_URL } from "./links";
import { ParticleWordmark } from "./particles/particle-wordmark";
import { Reveal } from "./reveal";
import { revealDelay } from "./reveal-style";

const FOOTER_LINK_CLASS =
  "w-max font-mono text-xs font-medium uppercase leading-4 tracking-[0.05em] text-white/80 transition-colors hover:text-white";

/** External links open in a new tab; site paths stay client-side. */
const FOOTER_COLUMNS: {
  title: string;
  className: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Framework",
    className: "md:w-[247px]",
    links: [
      { label: "Getting started", href: E2E_DOCS_URL },
      { label: "Examples", href: `${E2E_DOCS_URL}/browser` },
    ],
  },
  {
    title: "Resources",
    className: "md:w-[247px]",
    links: [
      { label: "Documentation", href: E2E_DOCS_URL },
      { label: "Changelog", href: `${E2E_GITHUB_URL}/blob/main/packages/e2e/CHANGELOG.md` },
    ],
  },
  {
    title: "Social",
    className: "md:flex-1",
    links: [
      { label: "GitHub", href: E2E_GITHUB_URL },
      { label: "Discord", href: "/discord" },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/testerarmy" },
      { label: "X", href: "https://x.com/testerarmy" },
    ],
  },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={FOOTER_LINK_CLASS}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={FOOTER_LINK_CLASS}>
      {label}
    </a>
  );
}

export function E2eFooter() {
  return (
    <footer className="relative mt-[120px] md:mt-[200px]">
      <div aria-hidden="true" className="absolute inset-x-0 -top-24 bottom-0 hidden sm:block">
        <ParticleWordmark topOverflow={96} />
      </div>
      <Reveal className="relative mx-auto max-w-[1200px] px-6 sm:px-10 sm:pt-[380px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:flex md:items-start md:gap-12">
          {FOOTER_COLUMNS.map((column, index) => (
            <div
              key={column.title}
              data-reveal
              style={revealDelay(index)}
              className={cn("flex flex-col gap-6", column.className)}
            >
              <p className="text-xs leading-[14px] text-white/50">{column.title}</p>
              <div className="flex flex-col gap-4">
                {column.links.map((link) => (
                  <FooterLink key={link.label} label={link.label} href={link.href} />
                ))}
              </div>
            </div>
          ))}
          <div
            data-reveal
            style={revealDelay(FOOTER_COLUMNS.length)}
            className="col-span-2 flex flex-col items-start md:col-span-1 md:shrink-0"
          >
            <p className="text-xs leading-[14px] text-white/50">Less setup. More testing.</p>
            <div className="mt-5 w-full sm:w-auto">
              <CopyCommandButton location="e2e_footer" className="w-full sm:w-auto" />
            </div>
          </div>
        </div>
      </Reveal>
      <div className="relative mt-16 sm:mt-0">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[58vw] sm:hidden">
          <ParticleWordmark />
        </div>
        <Reveal className="relative mx-auto max-w-[1200px] px-6 sm:px-10">
          <div
            data-reveal
            className="flex flex-col items-center gap-5 pb-10 pt-[34vw] text-center font-mono text-xs tracking-[0.1em] text-white sm:mt-24 sm:flex-row sm:justify-between sm:pb-16 sm:pt-0"
          >
            <p className="order-2 sm:order-1">© 2026 TesterArmy, Inc.</p>
            <a
              href="#top"
              className="order-1 flex items-center gap-2 uppercase transition-colors hover:text-white/70 sm:order-2"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
              Back to the top
            </a>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
