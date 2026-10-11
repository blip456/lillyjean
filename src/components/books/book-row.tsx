"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Link } from "@/components/ui/link";
import { setBookStatus } from "@/lib/books/actions";
import type { BookListItem } from "@/lib/books/types";

import { BookCover } from "./book-cover";

export type BookRowProps = {
  book: BookListItem;
  /** Where a tap on the row goes; defaults to the book page. */
  href?: string;
  /** Shows "+ Want to read" for books without a status (D1 search results). */
  quickAdd?: boolean;
};

/**
 * One book in a list (D1 results, Home, + menu): cover, title, author and my status.
 *
 * Owned by the status-tracking feature (Sprint 3), which adds swipe to change status (B4) and
 * the status sheet (B3). This first version has no gestures; the props are a shared contract.
 */
export function BookRow({ book, href, quickAdd = false }: BookRowProps) {
  const t = useTranslations("books");
  const [pending, startTransition] = useTransition();
  const authors = book.authors.join(", ") || t("unknownAuthor");

  return (
    <div className="flex items-center gap-3 py-2">
      <Link
        href={href ?? `/books/${book.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
      >
        <BookCover title={book.title} coverUrl={book.coverUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{book.title}</span>
          <span className="block truncate text-sm text-muted">{authors}</span>
        </span>
      </Link>
      {book.status ? (
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold">
          {t(`status.${book.status}`)}
          {book.status === "reading" && book.progress !== null
            ? ` · ${t("progress", { progress: book.progress })}`
            : ""}
        </span>
      ) : (
        quickAdd && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setBookStatus(book.id, "want_to_read");
              })
            }
            className="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs font-semibold"
          >
            {t("quickAdd")}
          </button>
        )
      )}
    </div>
  );
}
