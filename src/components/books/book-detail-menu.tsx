"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Sheet } from "@/components/ui/sheet";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { removeMyBook, restoreMyBook } from "@/lib/books/actions";
import type { BookListItem } from "@/lib/books/types";

import { MarkAsReadSheet } from "./mark-as-read-sheet";

const actionClass =
  "flex min-h-12 w-full items-center rounded-xl px-4 text-left font-semibold hover:bg-border/40 disabled:opacity-50";

/**
 * Overflow menu ⋯ on the book page (D2): "Mark as read again" (re-read, P28) for a read book and
 * "Remove from my books" (P38, with Undo) for any book on the shelf. Hidden when there is
 * nothing to do.
 */
export function BookDetailMenu({ book }: { book: BookListItem }) {
  const t = useTranslations();
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!book.status) return null;

  const remove = () =>
    startTransition(async () => {
      const result = await removeMyBook(book.id);
      setMenuOpen(false);
      if (!result.ok) {
        showSnackbar({ message: errorMessage(result.error) ?? "" });
        return;
      }
      showSnackbar({
        message: t("books.removed"),
        actionLabel: t("books.undo"),
        onAction: () => {
          void restoreMyBook(book.id, result.data);
        },
      });
    });

  return (
    <>
      <button
        type="button"
        aria-label={t("bookDetail.more")}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
        className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={book.title}
        description={book.authors.join(", ") || t("books.unknownAuthor")}
      >
        <ul className="-mx-2 space-y-1">
          {book.status === "read" && (
            <li>
              <button
                type="button"
                className={actionClass}
                onClick={() => {
                  setMenuOpen(false);
                  setMarkOpen(true);
                }}
              >
                {t("bookDetail.markAsReadAgain")}
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              className={`${actionClass} text-danger`}
              onClick={remove}
            >
              {t("bookDetail.remove")}
            </button>
          </li>
        </ul>
      </Sheet>
      <MarkAsReadSheet
        book={book}
        open={markOpen}
        onClose={() => setMarkOpen(false)}
      />
    </>
  );
}
