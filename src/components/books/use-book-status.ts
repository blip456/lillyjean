"use client";

import { useTranslations } from "next-intl";
import { startTransition, useOptimistic } from "react";

import { useSnackbar } from "@/components/ui/snackbar";
import { useErrorMessage } from "@/components/use-error-message";
import {
  type ActionResult,
  markBookRead,
  removeMyBook,
  restoreBookStatus,
  restoreMyBook,
  setBookStatus,
  undoMarkBookRead,
} from "@/lib/books/actions";
import type { BookListItem, PreviousBookState } from "@/lib/books/types";

import {
  applyChange,
  type BookState,
  previousStateOf,
  snackbarMessageFor,
  stateOf,
  type StatusChange,
} from "./status-rules";

export type BookStatusApi = {
  /** What the screen shows: the server state, or the change that is on its way. */
  state: BookState;
  setStatus: (
    status: "want_to_read" | "reading",
    progress: number | null,
  ) => void;
  /** `finishedOn` is YYYY-MM-DD (validated by the caller) or empty for today. */
  markRead: (finishedOn: string, onMarked?: (readId: number) => void) => void;
  remove: () => void;
};

/** Network errors and thrown errors become the generic "Something went wrong". */
async function attempt<T>(
  action: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch (error) {
    console.error(error);
    return { ok: false, error: "unknown" };
  }
}

/**
 * Status changes for one book (B3, B4, D2, D4). Each change shows at once (optimistic), goes
 * back when the server refuses it (with the error in the snackbar), and offers Undo for 5 s
 * that restores exactly the previous state (T19). The server actions refresh every page.
 */
export function useBookStatus(
  book: Pick<BookListItem, "id" | "status" | "progress" | "readCount">,
): BookStatusApi {
  const t = useTranslations("bookStatus");
  const tBooks = useTranslations("books");
  const errorMessage = useErrorMessage();
  const showSnackbar = useSnackbar();
  const [state, setOptimistic] = useOptimistic(stateOf(book));

  function messageFor(before: BookState, change: StatusChange) {
    const message = snackbarMessageFor(before, change);
    switch (message.key) {
      case "movedTo":
        return tBooks("movedTo", {
          status: tBooks(`status.${message.status}`),
        });
      case "markedRead":
      case "removed":
        return tBooks(message.key);
      default:
        return t(message.key);
    }
  }

  function run<T>(
    change: StatusChange,
    perform: () => Promise<ActionResult<T>>,
    undo: (data: T, previous: PreviousBookState) => Promise<ActionResult>,
    onDone?: (data: T) => void,
  ) {
    const before = state;
    const previous = previousStateOf(before);
    startTransition(async () => {
      setOptimistic(applyChange(before, change));
      const result = await attempt(perform);
      if (!result.ok) {
        showSnackbar({ message: errorMessage(result.error) ?? "" });
        return;
      }
      onDone?.(result.data);
      showSnackbar({
        message: messageFor(before, change),
        actionLabel: tBooks("undo"),
        onAction: () =>
          startTransition(async () => {
            setOptimistic(before);
            const undone = await attempt(() => undo(result.data, previous));
            showSnackbar({
              message: undone.ok
                ? t("undone")
                : (errorMessage(undone.error) ?? ""),
            });
          }),
      });
    });
  }

  return {
    state,
    setStatus: (status, progress) =>
      run(
        { kind: "status", status, progress },
        () =>
          setBookStatus(
            book.id,
            status,
            status === "reading" ? progress : null,
          ),
        (_, previous) => restoreBookStatus(book.id, previous),
      ),
    markRead: (finishedOn, onMarked) =>
      run(
        { kind: "read" },
        () => markBookRead(book.id, finishedOn),
        ({ readId }, previous) => undoMarkBookRead(readId, previous),
        ({ readId }) => onMarked?.(readId),
      ),
    remove: () =>
      run(
        { kind: "remove" },
        () => removeMyBook(book.id),
        (snapshot) => restoreMyBook(book.id, snapshot),
      ),
  };
}
