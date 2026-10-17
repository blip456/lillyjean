"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { useCelebrate } from "@/components/challenges/celebration";
import { previewCompletedChallenges } from "@/components/challenges/integration/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useErrorMessage } from "@/components/use-error-message";
import type { BookListItem } from "@/lib/books/types";
import { finishedOnSchema, localDate } from "@/lib/books/validation";
import type { CompletedChallenge } from "@/lib/challenges/types";
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
 * Mark as read (D4): finish date (default today, at most today, P35), the challenges this read
 * completes ("This completes 2 challenges", P10: only my picks, only for a date inside their
 * window, P13) and the re-read note (P28). Saving closes the sheet at once; a snackbar offers
 * Undo for 5 s, and when challenges were completed the celebration (E7) follows. Every way to
 * Read goes through this sheet (B3, B4, D2, the + menu, the search), so all of them celebrate.
 * Rating (S8) joins in a later sprint.
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
  const celebrate = useCelebrate();

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
          bookId={book.id}
          isReRead={api.state.readCount > 0}
          onSubmit={(finishedOn) => {
            onClose();
            api.markRead(finishedOn, (readId, completed) => {
              celebrate(completed);
              onMarked?.(readId);
            });
          }}
        />
      )}
    </Sheet>
  );
}

function MarkAsReadForm({
  bookId,
  isReRead,
  onSubmit,
}: {
  bookId: string;
  isReRead: boolean;
  onSubmit: (finishedOn: string) => void;
}) {
  const t = useTranslations("books");
  const errorMessage = useErrorMessage();
  const id = useId();
  const [error, setError] = useState<string>();
  const [today] = useState(localDate);
  const [finishedOn, setFinishedOn] = useState(today);
  const completes = useCompletesPreview(bookId, finishedOn, today);

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
            onChange={(event) => setFinishedOn(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>
      <CompletesPreview challenges={completes} />
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

/**
 * The challenges that marking the book as read on `finishedOn` would complete, asked again when
 * the date changes (an empty field means today). Answers to an older date are ignored.
 */
function useCompletesPreview(
  bookId: string,
  finishedOn: string,
  today: string,
) {
  const [preview, setPreview] = useState<{
    date: string;
    challenges: CompletedChallenge[];
  } | null>(null);
  const latest = useRef(0);
  const date = finishedOn || today;
  const valid = finishedOnSchema.safeParse(date).success && date <= today;

  useEffect(() => {
    if (!valid) return;
    const request = ++latest.current;
    previewCompletedChallenges(bookId, date).then(
      (challenges) => {
        if (request === latest.current) setPreview({ date, challenges });
      },
      () => {},
    );
  }, [bookId, date, valid]);

  return valid && preview?.date === date ? preview.challenges : [];
}

function CompletesPreview({
  challenges,
}: {
  challenges: CompletedChallenge[];
}) {
  const t = useTranslations("challengeHints");
  return (
    <div aria-live="polite">
      {challenges.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
          <p className="flex items-center gap-1 font-semibold">
            <span aria-hidden="true">⚑</span>
            {t("completes", { count: challenges.length })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {challenges.map((challenge) => (
              <li
                key={challenge.id}
                className="max-w-full rounded-full border border-border px-3 py-1 break-words"
              >
                {challenge.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
