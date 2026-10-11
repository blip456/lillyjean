"use client";

import { useTranslations } from "next-intl";
import type { ComponentType, RefObject } from "react";

import { Link } from "@/components/ui/link";
import { activeTab, type TabId } from "@/lib/navigation";

import { CREATE_MENU_ID } from "./create-menu";
import {
  ChallengesIcon,
  CloseIcon,
  FriendsIcon,
  HomeIcon,
  PlusIcon,
  ReadlistsIcon,
} from "./icons";

const icons: Record<TabId, ComponentType> = {
  home: HomeIcon,
  readlists: ReadlistsIcon,
  challenges: ChallengesIcon,
  friends: FriendsIcon,
};

type TabBarProps = {
  pathname: string;
  menuOpen: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onToggleMenu: () => void;
};

/**
 * Classic tab bar (N1, P21): Home · Readlists · + · Challenges · Friends, fixed at the bottom.
 * Its height is `--tab-bar-height` (globals.css), which keeps content and the snackbar clear.
 */
export function TabBar({
  pathname,
  menuOpen,
  toggleRef,
  onToggleMenu,
}: TabBarProps) {
  const t = useTranslations("tabs");
  const current = activeTab(pathname);

  const tab = (id: TabId, href: string) => {
    const Icon = icons[id];
    const isCurrent = current === id;
    return (
      <li>
        <Link
          href={href}
          aria-current={isCurrent ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs ${
            isCurrent ? "font-semibold text-foreground" : "text-muted"
          }`}
        >
          <Icon />
          <span>{t(id)}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={t("label")}
      data-tab-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-(--tab-bar-height) max-w-md grid-cols-5 items-center px-2 md:max-w-xl">
        {tab("home", "/")}
        {tab("readlists", "/readlists")}
        <li className="flex justify-center">
          <button
            ref={toggleRef}
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? CREATE_MENU_ID : undefined}
            aria-label={menuOpen ? t("closeCreate") : t("create")}
            className="-mt-6 inline-flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md"
          >
            {menuOpen ? <CloseIcon /> : <PlusIcon />}
          </button>
        </li>
        {tab("challenges", "/challenges")}
        {tab("friends", "/friends")}
      </ul>
    </nav>
  );
}
