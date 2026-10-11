"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Link } from "@/components/ui/link";
import {
  BOOK_STATUSES,
  type BookListItem,
  type BookStatus,
} from "@/lib/books/types";

import { BookCover } from "./book-cover";
import { MarkAsReadSheet } from "./mark-as-read-sheet";
import { nextStatus } from "./status-rules";
import { StatusSheet } from "./status-sheet";
import { dismissSwipeHint, SwipeHint, useSwipeHint } from "./swipe-hint";
import { SwipeRow } from "./swipe-row";
import { useBookStatus } from "./use-book-status";

export type BookRowProps = {
  book: BookListItem;
  /** Where a tap on the row goes; defaults to the book page. */
  href?: string;
  /** Shows "+ Want to read" for books without a status (D1 search results). */
  quickAdd?: boolean;
  /** Swipe to change status (B4); on by default. Turn off where a row is only picked. */
  swipeable?: boolean;
};

/** Colours of the revealed statuses, light to dark in the order of a reading life. */
const statusTone: Record<BookStatus, string> = {
  want_to_read: "bg-border text-foreground",
  reading: "bg-muted text-background",
  read: "bg-foreground text-background",
};

/**
 * One book in a list (D1 results, Home, + menu, shelf lists): cover, title, author and my
 * status. Swipe left to reveal the three statuses, or swipe far to apply the next one (B4).
 * The status pill opens the status sheet (B3), which does the same without gestures.
 * Every change shows at once and offers Undo.
 *
 * Owned by the status-tracking feature (Sprint 3); the props are a shared contract.
 */
export function BookRow({
  book,
  href,
  quickAdd = false,
  swipeable = true,
}: BookRowProps) {
  const t = useTranslations("books");
  const tStatus = useTranslations("bookStatus");
  const api = useBookStatus(book);
  const { state } = api;
  const [sheet, setSheet] = useState<"status" | "read" | null>(null);
  // A dialog also reports "close" when it closes because the other sheet opens; only close
  // the sheet that is still the open one.
  const closeSheet = (which: "status" | "read") =>
    setSheet((current) => (current === which ? null : current));
  // Sheets stay mounted after the first use, so closing them returns focus to the row.
  const [sheetsUsed, setSheetsUsed] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const showHint = useSwipeHint(swipeable);
  const authors = book.authors.join(", ") || t("unknownAuthor");
  const next = nextStatus(state.status);

  const openSheet = (which: "status" | "read") => {
    setSheetsUsed(true);
    setSheet(which);
  };

  const choose = (status: BookStatus) => {
    if (status === "read") openSheet("read");
    else if (status !== state.status) api.setStatus(status, null);
  };

  const pillText =
    state.status &&
    `${t(`status.${state.status}`)}${
      state.status === "reading" && state.progress !== null
        ? ` · ${t("progress", { progress: state.progress })}`
        : ""
    }`;

  return (
    <div>
      {showHint && <SwipeHint onDismiss={() => linkRef.current?.focus()} />}
      <SwipeRow
        enabled={swipeable}
        actionCount={BOOK_STATUSES.length}
        commitLabel={t(`status.${next}`)}
        commitClassName={statusTone[next]}
        onCommit={() => choose(next)}
        onSwiped={dismissSwipeHint}
        actions={
          <div
            role="group"
            aria-label={tStatus("swipeActions", { title: book.title })}
            className="flex h-full w-full"
          >
            {BOOK_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={state.status === status}
                onClick={() => choose(status)}
                className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs leading-tight font-semibold focus-visible:-outline-offset-4 ${statusTone[status]}`}
              >
                {state.status === status && <span aria-hidden="true">✓</span>}
                {t(`status.${status}`)}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex items-center gap-3 py-2">
          <Link
            ref={linkRef}
            href={href ?? `/books/${book.id}`}
            draggable={false}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:-outline-offset-2"
          >
            <BookCover title={book.title} coverUrl={book.coverUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{book.title}</span>
              <span className="block truncate text-sm text-muted">
                {authors}
              </span>
              {state.status === "reading" && state.progress !== null && (
                <span
                  aria-hidden="true"
                  className="mt-2 block h-1 w-full max-w-40 overflow-hidden rounded-full bg-border"
                >
                  <span
                    className="block h-full origin-left rounded-full bg-foreground"
                    style={{ transform: `scaleX(${state.progress / 100})` }}
                  />
                </span>
              )}
            </span>
          </Link>
          {state.status || !quickAdd ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => openSheet("status")}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:-outline-offset-2"
            >
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold whitespace-nowrap">
                {pillText || t("setStatus")}
              </span>
              <span className="sr-only">
                {`: ${t("changeStatusOf", { title: book.title })}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => api.setStatus("want_to_read", null)}
              className="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs font-semibold"
            >
              {t("quickAdd")}
            </button>
          )}
        </div>
      </SwipeRow>
      {sheetsUsed && (
        <>
          <StatusSheet
            book={book}
            state={state}
            open={sheet === "status"}
            onClose={() => closeSheet("status")}
            onSave={api.setStatus}
            onRead={() => setSheet("read")}
            onRemove={api.remove}
          />
          <MarkAsReadSheet
            book={book}
            statusApi={api}
            open={sheet === "read"}
            onClose={() => closeSheet("read")}
          />
        </>
      )}
    </div>
  );
}
