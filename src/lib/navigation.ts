/**
 * Tab bar (N1, P21): Home · Readlists · + · Challenges · Friends. The + opens the create menu
 * (N2) instead of a page.
 */
export const TABS = [
  { id: "home", href: "/" },
  { id: "readlists", href: "/readlists" },
  { id: "challenges", href: "/challenges" },
  { id: "friends", href: "/friends" },
] as const;

export type TabId = (typeof TABS)[number]["id"];
export type ComingSoonFeature = Exclude<TabId, "home">;

/**
 * Readlists, Challenges and Friends open a "coming soon" page until the backlog sprint that
 * brings them ships (docs/backlog.md).
 */
export const COMING_SOON_SPRINT: Record<ComingSoonFeature, number> = {
  readlists: 4,
  challenges: 5,
  friends: 7,
};

/** The tab that the current page belongs to, if any. */
export function activeTab(pathname: string): TabId | null {
  if (pathname === "/") return "home";
  const tab = TABS.find(
    (item) =>
      item.href !== "/" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return tab?.id ?? null;
}

/**
 * The tab bar hides in forms (N1): adding a book by hand and the settings forms, which have
 * their own way back.
 */
export function hidesTabBar(pathname: string) {
  return pathname === "/books/new" || pathname.startsWith("/settings/");
}

/** "Can't find it? Add it manually" (A10, D1): D3 with the search text as title and a way back. */
export function addManuallyHref(returnTo: string, title: string) {
  const params = new URLSearchParams({ returnTo });
  if (title.trim()) params.set("title", title.trim());
  return `/books/new?${params}`;
}
