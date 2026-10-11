"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { setBookStatus } from "@/lib/books/actions";
import { BOOK_STATUSES, type BookListItem } from "@/lib/books/types";

import { MarkAsReadSheet } from "./mark-as-read-sheet";

export type BookStatusControlProps = {
  book: BookListItem;
};

/**
 * Status control on the book page (D2): Want to read · Reading · Read. Read opens the
 * mark-as-read sheet (D4); Reading shows the optional percentage.
 *
 * Owned by the status-tracking feature (Sprint 3): this first version is a plain segmented
 * control; the props are a shared contract.
 */
export function BookStatusControl({ book }: BookStatusControlProps) {
  const t = useTranslations("books");
  const [markOpen, setMarkOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t("myStatus")}
        className="grid grid-cols-3 gap-2"
      >
        {BOOK_STATUSES.map((status) => {
          const current = book.status === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={current}
              disabled={pending}
              onClick={() => {
                if (status === "read") {
                  setMarkOpen(true);
                  return;
                }
                if (current) return;
                startTransition(async () => {
                  await setBookStatus(book.id, status, null);
                });
              }}
              className="min-h-11 rounded-xl border border-border px-2 text-sm font-semibold aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {t(`status.${status}`)}
            </button>
          );
        })}
      </div>
      {book.status === "reading" && book.progress !== null && (
        <p className="text-sm text-muted">
          {t("progress", { progress: book.progress })}
        </p>
      )}
      <MarkAsReadSheet
        book={book}
        open={markOpen}
        onClose={() => setMarkOpen(false)}
      />
    </div>
  );
}
