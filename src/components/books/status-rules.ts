import type {
  BookListItem,
  BookStatus,
  PreviousBookState,
} from "@/lib/books/types";

/**
 * Pure rules for changing a book's status (B3, B4, D2, D4). No React, so they are unit tested
 * (status-rules.test.ts) and shared by the row, the status sheet and the book page control.
 */

/** What the screen shows for one book; changed optimistically before the server answers. */
export type BookState = Pick<BookListItem, "status" | "progress" | "readCount">;

export function stateOf(book: BookState): BookState {
  return {
    status: book.status,
    progress: book.status === "reading" ? book.progress : null,
    readCount: book.readCount,
  };
}

/**
 * The status a long swipe applies (B4): no status → Want to read → Reading → Read.
 * A book that is already Read stays Read: the long swipe opens D4 for a re-read (P28).
 */
export function nextStatus(status: BookStatus | null): BookStatus {
  if (status === null) return "want_to_read";
  if (status === "want_to_read") return "reading";
  return "read";
}

/** The state Undo goes back to; `null` = the book was not on the shelf. */
export function previousStateOf(state: BookState): PreviousBookState {
  return state.status
    ? { status: state.status, progress: state.progress }
    : null;
}

/** A change made from the status sheet, a swipe, the book page or the mark-as-read sheet. */
export type StatusChange =
  | {
      kind: "status";
      status: "want_to_read" | "reading";
      progress: number | null;
    }
  | { kind: "read" }
  | { kind: "remove" };

/** The optimistic state right after a change, before the server confirms it. */
export function applyChange(state: BookState, change: StatusChange): BookState {
  switch (change.kind) {
    case "status":
      return {
        ...state,
        status: change.status,
        progress: change.status === "reading" ? change.progress : null,
      };
    case "read":
      return {
        ...state,
        status: "read",
        progress: null,
        readCount: state.readCount + 1,
      };
    case "remove":
      // P38: removing also deletes the reads.
      return { status: null, progress: null, readCount: 0 };
  }
}

/** True when saving the status sheet would change nothing (so it only closes). */
export function isSameState(
  state: BookState,
  status: "want_to_read" | "reading",
  progress: number | null,
): boolean {
  return (
    state.status === status &&
    (status !== "reading" || (state.progress ?? null) === (progress ?? null))
  );
}

/** Which snackbar message a change gets (keys under `bookStatus` in messages/en.json). */
export function snackbarMessageFor(
  before: BookState,
  change: StatusChange,
):
  | { key: "movedTo"; status: BookStatus }
  | { key: "progressSaved" }
  | { key: "markedRead" }
  | { key: "markedReadAgain" }
  | { key: "removed" } {
  switch (change.kind) {
    case "status":
      return before.status === change.status
        ? { key: "progressSaved" }
        : { key: "movedTo", status: change.status };
    case "read":
      return before.readCount > 0 || before.status === "read"
        ? { key: "markedReadAgain" }
        : { key: "markedRead" };
    case "remove":
      return { key: "removed" };
  }
}
