"use client";

import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons/github-icon";
import { cn } from "@/lib/utils";
import { DocsIcon } from "./icon";
import { locate, type NavTab } from "./nav";
import { Search } from "./search";
import { ThemeMenu, ThemeSwitch } from "./theme-menu";

const GITHUB_URL = "https://github.com/tester-army/e2e";

/** The docs logo (`docs/logo-*.png`): the mascot, a slash, and the e2e wordmark. */
function Logo() {
  return (
    <Link href="/docs" aria-label="e2e docs home page" className="docs-logo">
      <Image src="/docs/logo-black.png" alt="" width={266} height={84} priority className="h-7 w-auto dark:hidden" />
      <Image src="/docs/logo-white.png" alt="" width={266} height={84} priority className="hidden h-7 w-auto dark:block" />
    </Link>
  );
}

/** The tabs in the navigation drawer: the current one, opening onto the others. */
function TabPicker({ nav, current, onNavigate }: { nav: NavTab[]; current: NavTab; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="docs-sidebar-tabs">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="docs-tab-picker">
        <span>{current.name}</span>
        <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.6} />
      </button>
      {open && (
        <div className="docs-tab-picker-list">
          <TabLinks nav={nav} current={current} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

function TabLinks({ nav, current, onNavigate }: { nav: NavTab[]; current: NavTab; onNavigate?: () => void }) {
  return nav.map((tab) => (
    <Link
      key={tab.name}
      href={tab.href}
      data-active={tab === current ? "" : undefined}
      className="docs-tab-link"
      onClick={onNavigate}
    >
      <DocsIcon icon={tab.icon} className="size-4" />
      {tab.name}
    </Link>
  ));
}

function Promo({ promo, className }: { promo?: { label: string; href: string }; className?: string }) {
  if (!promo) return null;
  return (
    <a href={promo.href} target="_blank" rel="noreferrer" className={cn("docs-promo", className)}>
      <span className="docs-promo-title">{promo.label}</span>
      <span className="docs-promo-text">TesterArmy runs your critical flows with AI agents and reports back after every deploy.</span>
      <span className="docs-promo-button">Start testing</span>
    </a>
  );
}

/**
 * The docs frame around every page: the header with search and the theme,
 * the tabs, and the sidebar. Below 1024px the tabs and the sidebar move into
 * a menu behind the "Navigation" button.
 */
export function DocsShell({
  nav,
  promo,
  github,
  children,
}: {
  nav: NavTab[];
  promo?: { label: string; href: string };
  /** The navbar's GitHub link, rendered on the server for its star count. */
  github: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { tab, group, page } = locate(nav, pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // A navigation closes the menu, so the next page shows.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.dataset.menuOpen = "";
    return () => {
      window.removeEventListener("keydown", onKey);
      delete document.documentElement.dataset.menuOpen;
    };
  }, [menuOpen]);

  return (
    <div className="docs-root">
      <header className="docs-header">
        <div className="docs-header-row">
          <Logo />
          <div className="docs-header-search">
            <Search />
          </div>
          <div className="docs-header-actions">
            {github}
            <ThemeMenu />
          </div>
        </div>
        <nav aria-label="Sections" className="docs-tabs-bar no-scrollbar">
          <TabLinks nav={nav} current={tab} />
        </nav>
        <div className="docs-mobile-bar">
          <button
            type="button"
            aria-label="Navigation"
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            onClick={() => setMenuOpen(!menuOpen)}
            className="docs-mobile-toggle"
          >
            {menuOpen ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" strokeWidth={1.6} />}
          </button>
          <p className="docs-mobile-crumbs">
            {group && (
              <>
                <span className="truncate">{group.name}</span>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
              </>
            )}
            <span className="truncate text-ink">{page?.title ?? "Page not found"}</span>
          </p>
        </div>
      </header>

      <div className="docs-body">
        <nav id="sidebar" aria-label="Docs" className="docs-sidebar" data-open={menuOpen ? "" : undefined}>
          <div className="docs-drawer-head">
            <Logo />
            <ThemeSwitch />
          </div>
          <TabPicker key={pathname} nav={nav} current={tab} onNavigate={closeMenu} />
          {tab.groups.map((navGroup) => (
            <div key={navGroup.name} className="docs-sidebar-group">
              {/* A tab of bare pages has no group name to show, as on Mintlify. */}
              {navGroup.name !== tab.name && <p className="docs-sidebar-heading">{navGroup.name}</p>}
              <ul>
                {navGroup.pages.map((navPage) => {
                  const current = navPage === page;
                  return (
                    <li key={navPage.href}>
                      <Link
                        href={navPage.href}
                        aria-current={current ? "page" : undefined}
                        className="docs-sidebar-link"
                        onClick={closeMenu}
                      >
                        <DocsIcon icon={navPage.icon} className="docs-sidebar-icon size-4 shrink-0" />
                        <span>{navPage.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="docs-sidebar-footer">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="docs-sidebar-link">
              <GithubIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>GitHub</span>
            </a>
            <Promo promo={promo} />
          </div>
        </nav>
        {menuOpen && (
          <>
            <div aria-hidden="true" className="docs-scrim" onClick={closeMenu} />
            <button type="button" aria-label="Close navigation" className="docs-drawer-close" onClick={closeMenu}>
              <X aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
            </button>
          </>
        )}
        <div className="docs-main">{children}</div>
      </div>
    </div>
  );
}

export { Promo };
