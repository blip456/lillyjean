"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { BookRow } from "@/components/books/book-row";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import type { BookListItem } from "@/lib/books/types";
import {
  removeBookFromReadlist,
  restoreBookInReadlist,
} from "@/lib/readlists/actions";

type ReadlistBooksProps = {
  readlistId: string;
  books: BookListItem[];
};

/**
 * The books of a readlist (C2), most recently added first (P40), as the usual rows: tap opens
 * the book, swipe changes my status (B4). The long-press menu (B5) gets "Remove from this
 * readlist", which hides the row at once and offers Undo (back in its old place).
 */
export function ReadlistBooks({ readlistId, books }: ReadlistBooksProps) {
  const t = useTranslations("readlists");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  // Rows removed on this screen, hidden until the refreshed list arrives (or Undo).
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  // Once the refreshed list no longer has a removed book, forget it, so adding it again shows it.
  if ([...hidden].some((id) => !books.some((book) => book.id === id)))
    setHidden(
      new Set([...hidden].filter((id) => books.some((book) => book.id === id))),
    );

  const setRowHidden = (bookId: string, hide: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (hide) next.add(bookId);
      else next.delete(bookId);
      return next;
    });

  const remove = (book: BookListItem) => {
    setRowHidden(book.id, true);
    startTransition(async () => {
      const result = await removeBookFromReadlist(readlistId, book.id).catch(
        (error: unknown) => {
          console.error(error);
          return { ok: false as const, error: "unknown" };
        },
      );
      if (!result.ok) {
        setRowHidden(book.id, false);
        showSnackbar({ message: errorMessage(result.error) ?? "" });
        return;
      }
      const removed = result.data;
      showSnackbar({
        message: t("removed"),
        ...(removed && {
          actionLabel: t("undo"),
          onAction: () =>
            startTransition(async () => {
              const undo = await restoreBookInReadlist(removed).catch(() => ({
                ok: false as const,
                error: "unknown",
              }));
              if (undo.ok) setRowHidden(book.id, false);
              else showSnackbar({ message: errorMessage(undo.error) ?? "" });
            }),
        }),
      });
    });
  };

  return (
    <ul aria-label={t("booksLabel")} className="divide-y divide-border">
      {books
        .filter((book) => !hidden.has(book.id))
        .map((book) => (
          <li key={book.id} className="py-1">
            <BookRow
              book={book}
              menuActions={[
                {
                  label: t("removeFromReadlist"),
                  onSelect: () => remove(book),
                },
              ]}
            />
          </li>
        ))}
    </ul>
  );
}
