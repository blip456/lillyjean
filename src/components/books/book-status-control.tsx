"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { BOOK_STATUSES, type BookListItem } from "@/lib/books/types";

import { MarkAsReadSheet } from "./mark-as-read-sheet";
import { StatusSheet } from "./status-sheet";
import { useBookStatus } from "./use-book-status";

export type BookStatusControlProps = {
  book: BookListItem;
};

/**
 * Status control on the book page (D2): Want to read · Reading · Read. Read opens the
 * mark-as-read sheet (D4), also on a book that is already Read (a re-read, P28). Reading shows
 * the optional percentage with Edit, which opens the status sheet (B3). Changes show at once and
 * offer Undo.
 *
 * Owned by the status-tracking feature (Sprint 3); the props are a shared contract.
 */
export function BookStatusControl({ book }: BookStatusControlProps) {
  const t = useTranslations("books");
  const tStatus = useTranslations("bookStatus");
  const api = useBookStatus(book);
  const { state } = api;
  const [sheet, setSheet] = useState<"status" | "read" | null>(null);
  // A dialog also reports "close" when it closes because the other sheet opens; only close
  // the sheet that is still the open one.
  const closeSheet = (which: "status" | "read") =>
    setSheet((current) => (current === which ? null : current));

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label={t("myStatus")}
        className="grid grid-cols-3 gap-2"
      >
        {BOOK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={state.status === status}
            aria-haspopup={status === "read" ? "dialog" : undefined}
            onClick={() => {
              if (status === "read") setSheet("read");
              else if (state.status !== status) api.setStatus(status, null);
            }}
            className="min-h-11 rounded-xl border border-border px-2 text-sm font-semibold aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {t(`status.${status}`)}
          </button>
        ))}
      </div>
      {state.status === "reading" && (
        <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl bg-border/40 py-1 pr-1 pl-4 text-sm">
          <p>
            {state.progress === null
              ? tStatus("progressSummaryNotSet")
              : tStatus("progressSummary", { progress: state.progress })}
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setSheet("status")}
            aria-label={tStatus("editProgressLabel")}
            className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-4"
          >
            {tStatus("editProgress")}
          </button>
        </div>
      )}
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
    </div>
  );
}
