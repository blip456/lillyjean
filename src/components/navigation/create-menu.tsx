"use client";

import { useTranslations } from "next-intl";
import { type ComponentType, useEffect, useId, useRef } from "react";

import { Link } from "@/components/ui/link";
import { NEW_CHALLENGE_PATH } from "@/lib/challenges/links";

import {
  ChallengesIcon,
  CheckIcon,
  ChevronIcon,
  ReadlistsIcon,
  SearchIcon,
} from "./icons";

export const CREATE_MENU_ID = "create-menu";

type CreateMenuProps = {
  /** `true` when focus should go back to the + button (Escape, tap outside). */
  onClose: (returnFocus: boolean) => void;
};

/**
 * The + menu (N2, P22) as a bottom sheet above the tab bar, so the tabs stay usable. Four actions
 * in this order: Add book · Mark as read · New challenge · New readlist.
 */
export function CreateMenu({ onClose }: CreateMenuProps) {
  const t = useTranslations("createMenu");
  const titleId = useId();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    firstLinkRef.current?.focus();
  }, []);

  const actions: {
    href: string;
    title: string;
    hint: string;
    Icon: ComponentType;
  }[] = [
    {
      href: "/books/search",
      title: t("addBook"),
      hint: t("addBookHint"),
      Icon: SearchIcon,
    },
    {
      href: "/books/mark-as-read",
      title: t("markAsRead"),
      hint: t("markAsReadHint"),
      Icon: CheckIcon,
    },
    {
      href: NEW_CHALLENGE_PATH,
      title: t("newChallenge"),
      hint: t("newChallengeHint"),
      Icon: ChallengesIcon,
    },
    {
      href: "/readlists/new",
      title: t("newReadlist"),
      hint: t("newReadlistHint"),
      Icon: ReadlistsIcon,
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => onClose(true)}
        className="fixed inset-0 z-30 bg-black/40"
      />
      <div
        id={CREATE_MENU_ID}
        role="dialog"
        aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md rounded-t-3xl border border-b-0 border-border bg-surface px-6 pt-3 pb-4 md:max-w-xl"
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1.5 w-10 rounded-full bg-border"
        />
        <h2 id={titleId} className="mt-4 font-serif text-xl font-semibold">
          {t("title")}
        </h2>
        <ul className="mt-2 divide-y divide-border">
          {actions.map(({ href, title, hint, Icon }, index) => (
            <li key={href}>
              <Link
                ref={index === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={() => onClose(false)}
                className="flex min-h-11 items-center gap-4 rounded-lg py-3"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-muted">{hint}</span>
                </span>
                <ChevronIcon className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
