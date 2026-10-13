import type { NavTab } from "@/components/docs/nav";
import { docsPath, getPromo, getTabs, navLabel } from "./source";

/** The navigation for the docs frame: only what its client components draw. */
export function navigation(): NavTab[] {
  return getTabs().map((tab) => ({
    name: tab.name,
    icon: tab.icon,
    href: tab.href,
    groups: tab.groups.map((group) => ({
      name: group.name,
      pages: group.pages.map((page) => ({
        href: docsPath(page.slug),
        label: navLabel(page),
        title: page.title,
        icon: page.icon?.startsWith("/") ? `/docs${page.icon}` : page.icon,
      })),
    })),
  }));
}

export function promo() {
  const anchor = getPromo();
  return anchor && { label: anchor.anchor, href: anchor.href };
}
