/**
 * Tab bar (N1, P21): Home · Readlists · + · Challenges · Friends. The + (slot 3) opens the create
 * menu (N2) instead of a page. A tab only shows once its feature has shipped (N1: no "coming
 * soon" tabs); its slot stays the same, so tabs never move around. Flip `shipped` in the sprint
 * that brings the tab: Readlists in Sprint 4, Challenges in Sprint 5, Friends in Sprint 7.
 */
export const TABS = [
  { id: "home", href: "/", slot: 1, shipped: true },
  { id: "readlists", href: "/readlists", slot: 2, shipped: true },
  { id: "challenges", href: "/challenges", slot: 4, shipped: false },
  { id: "friends", href: "/friends", slot: 5, shipped: false },
] as const satisfies readonly {
  id: string;
  href: string;
  slot: 1 | 2 | 4 | 5;
  shipped: boolean;
}[];

export type Tab = (typeof TABS)[number];
export type TabId = Tab["id"];

/** Tabs that are shown in the tab bar. */
export function shippedTabs(): Tab[] {
  return TABS.filter((tab) => tab.shipped);
}

/** The shown tab that the current page belongs to, if any. */
export function activeTab(
  pathname: string,
  tabs: readonly Pick<Tab, "id" | "href">[] = shippedTabs(),
): TabId | null {
  const tab = tabs.find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return tab?.id ?? null;
}

/**
 * The tab bar hides in forms (N1): adding a book by hand, creating or editing a readlist (C3) or a
 * challenge (E6, E8) and the settings forms, which have their own way back.
 */
export function hidesTabBar(pathname: string) {
  return (
    pathname === "/books/new" ||
    pathname === "/readlists/new" ||
    /^\/readlists\/[^/]+\/edit$/.test(pathname) ||
    pathname === "/challenges/new" ||
    /^\/challenges\/[^/]+\/edit$/.test(pathname) ||
    pathname.startsWith("/settings/")
  );
}

/** "Can't find it? Add it manually" (A10, D1): D3 with the search text as title and a way back. */
export function addManuallyHref(returnTo: string, title: string) {
  const params = new URLSearchParams({ returnTo });
  if (title.trim()) params.set("title", title.trim());
  return `/books/new?${params}`;
}
