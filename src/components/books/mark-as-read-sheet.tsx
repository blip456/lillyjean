"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useErrorMessage } from "@/components/use-error-message";
import type { BookListItem } from "@/lib/books/types";
import { finishedOnSchema, localDate } from "@/lib/books/validation";
import { firstError } from "@/lib/validation";

import { type BookStatusApi, useBookStatus } from "./use-book-status";

export type MarkAsReadSheetProps = {
  book: Pick<
    BookListItem,
    "id" | "title" | "authors" | "status" | "progress" | "readCount"
  >;
  open: boolean;
  onClose: () => void;
  /**
   * Called once the server saved the read. The sheet closes straight away (optimistic), so this
   * runs after `onClose`.
   */
  onMarked?: (readId: number) => void;
  /**
   * The status state of a row or control that opened this sheet, so it shows Read at once.
   * Without it the sheet keeps its own.
   */
  statusApi?: BookStatusApi;
};

/**
 * Mark as read (D4): finish date (default today, at most today, P35) and the re-read note
 * (P28). Saving closes the sheet at once; a snackbar offers Undo for 5 s.
 * Rating (S8) and completed challenges (S5) join in later sprints.
 *
 * Owned by the status-tracking feature (Sprint 3); the props are a shared contract.
 */
export function MarkAsReadSheet({
  book,
  open,
  onClose,
  onMarked,
  statusApi,
}: MarkAsReadSheetProps) {
  const t = useTranslations("books");
  const ownApi = useBookStatus(book);
  const api = statusApi ?? ownApi;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("markAsRead")}
      description={`${book.title} · ${book.authors.join(", ") || t("unknownAuthor")}`}
    >
      {/* Mounted per opening, so the date starts at today and old errors are gone. */}
      {open && (
        <MarkAsReadForm
          isReRead={api.state.readCount > 0}
          onSubmit={(finishedOn) => {
            onClose();
            api.markRead(finishedOn, onMarked);
          }}
        />
      )}
    </Sheet>
  );
}

function MarkAsReadForm({
  isReRead,
  onSubmit,
}: {
  isReRead: boolean;
  onSubmit: (finishedOn: string) => void;
}) {
  const t = useTranslations("books");
  const errorMessage = useErrorMessage();
  const id = useId();
  const [error, setError] = useState<string>();
  const [today] = useState(localDate);

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const finishedOn = String(
          new FormData(event.currentTarget).get("finishedOn") ?? "",
        );
        // Checked here too, so the sheet can close before the server answers.
        const parsed = finishedOnSchema.safeParse(finishedOn);
        if (!parsed.success || (finishedOn && finishedOn > today)) {
          setError(
            parsed.success ? "finishedOnFuture" : firstError(parsed.error),
          );
          return;
        }
        onSubmit(finishedOn);
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
      {isReRead && (
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
          {t("reReadNote")}
        </p>
      )}
      <Button type="submit" block>
        {t("markAsRead")}
      </Button>
    </form>
  );
}
