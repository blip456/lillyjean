"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import { markBookRead, undoMarkBookRead } from "@/lib/books/actions";
import type { BookListItem } from "@/lib/books/types";
import { localDate } from "@/lib/books/validation";

export type MarkAsReadSheetProps = {
  book: Pick<
    BookListItem,
    "id" | "title" | "authors" | "status" | "progress" | "readCount"
  >;
  open: boolean;
  onClose: () => void;
  /** Called after the book is marked as read (before the sheet closes). */
  onMarked?: (readId: number) => void;
};

/**
 * Mark as read (D4): finish date (default today, D-PO1) and the re-read note (P28).
 * After saving, a snackbar offers Undo.
 *
 * Owned by the status-tracking feature (Sprint 3); the props are a shared contract.
 */
export function MarkAsReadSheet({
  book,
  open,
  onClose,
  onMarked,
}: MarkAsReadSheetProps) {
  const t = useTranslations("books");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const id = useId();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const today = localDate();

  const previous = book.status
    ? { status: book.status, progress: book.progress }
    : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("markAsRead")}
      description={`${book.title} · ${book.authors.join(", ") || t("unknownAuthor")}`}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const finishedOn = String(
            new FormData(event.currentTarget).get("finishedOn") ?? "",
          );
          startTransition(async () => {
            const result = await markBookRead(book.id, finishedOn);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setError(undefined);
            onMarked?.(result.data.readId);
            onClose();
            showSnackbar({
              message: t("markedRead"),
              actionLabel: t("undo"),
              onAction: () => {
                void undoMarkBookRead(result.data.readId, previous);
              },
            });
          });
        }}
      >
        <Field
          id={`${id}-finished-on`}
          label={t("finishedOn")}
          hint={t("finishedOnHint")}
          error={errorMessage(error)}
        >
          {(describedBy, invalid) => (
            <Input
              id={`${id}-finished-on`}
              name="finishedOn"
              type="date"
              defaultValue={today}
              max={today}
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
          )}
        </Field>
        {book.readCount > 0 && (
          <p className="text-sm text-muted">{t("reReadNote")}</p>
        )}
        <Button type="submit" block disabled={pending}>
          {t("markAsRead")}
        </Button>
      </form>
    </Sheet>
  );
}
