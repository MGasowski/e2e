/** The navigation as the client components get it: only what they draw. */
export interface NavTab {
  name: string;
  icon: string;
  href: string;
  groups: { name: string; pages: NavPage[] }[];
}

export interface NavPage {
  href: string;
  label: string;
  title: string;
  icon?: string;
}

/** The tab and page a path belongs to; the docs home for an unknown path. */
export function locate(nav: NavTab[], pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/docs";
  for (const tab of nav) {
    for (const group of tab.groups) {
      const page = group.pages.find((candidate) => candidate.href === path);
      if (page) return { tab, group, page };
    }
  }
  return { tab: nav[0], group: undefined, page: undefined };
}
