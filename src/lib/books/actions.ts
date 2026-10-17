"use server";

import { redirect, RedirectType } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { challengesCompletedBy } from "@/lib/challenges/queries.server";
import type { CompletedChallenge } from "@/lib/challenges/types";
import { readlistIdSchema } from "@/lib/readlists/validation";
import { refreshScreens } from "@/lib/refresh-screens.server";
import { createClient } from "@/lib/supabase/server";
import { firstError } from "@/lib/validation";

import { BookSearchUnavailableError } from "./providers";
import { searchBooks } from "./queries.server";
import type {
  BookListItem,
  PreviousBookState,
  RemovedBookSnapshot,
  SearchField,
} from "./types";
import {
  bookIdSchema,
  bookStatusSchema,
  finishedOnSchema,
  manualBookSchema,
  progressSchema,
  searchFieldSchema,
  searchQuerySchema,
} from "./validation";

/**
 * Server Actions for books. Every action checks the session; the database checks ownership
 * (RLS) and the rules (supabase/migrations/20261012090000_books.sql).
 * Results carry translation keys under `errors` in messages/en.json.
 */

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/welcome");
  return supabase;
}

function failed(error: unknown): { ok: false; error: string } {
  console.error(error);
  return { ok: false, error: "unknown" };
}

/** Search from a client component (onboarding A10, live search on D1). */
export async function searchBooksAction(
  query: string,
  field: SearchField = "all",
): Promise<ActionResult<BookListItem[]>> {
  const text = searchQuerySchema.safeParse(query);
  if (!text.success) return { ok: false, error: firstError(text.error) };
  await requireUser();
  try {
    return {
      ok: true,
      data: await searchBooks(text.data, searchFieldSchema.parse(field)),
    };
  } catch (error) {
    if (error instanceof BookSearchUnavailableError)
      return { ok: false, error: "searchUnavailable" };
    return failed(error);
  }
}

/** Want to read or Reading, with an optional percentage while reading. */
export async function setBookStatus(
  bookId: string,
  status: "want_to_read" | "reading",
  progress: number | null = null,
): Promise<ActionResult> {
  const id = bookIdSchema.safeParse(bookId);
  const parsedStatus = bookStatusSchema.safeParse(status);
  const parsedProgress = progressSchema.safeParse(progress);
  if (!parsedProgress.success)
    return { ok: false, error: firstError(parsedProgress.error) };
  if (!id.success || !parsedStatus.success || parsedStatus.data === "read")
    return { ok: false, error: "unknown" };

  const supabase = await requireUser();
  const { error } = await supabase.rpc("set_book_status", {
    p_book_id: id.data,
    p_status: parsedStatus.data,
    p_progress:
      parsedStatus.data === "reading" && parsedProgress.data !== null
        ? parsedProgress.data
        : undefined,
  });
  if (error) return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}

/**
 * Marks a book as read (D4) on `finishedOn` (YYYY-MM-DD, empty = today). Also for re-reads.
 * Returns the read id for Undo and the challenges this read completed, for the celebration (E7):
 * open challenges where the book is my pick and the date is inside the window (P10, P13).
 * Completion is derived from the reads (T23), so they are worked out before the read is saved;
 * Undo takes the completion back by removing the read.
 */
export async function markBookRead(
  bookId: string,
  finishedOn = "",
): Promise<ActionResult<{ readId: number; completed: CompletedChallenge[] }>> {
  const id = bookIdSchema.safeParse(bookId);
  if (!id.success) return { ok: false, error: "unknown" };
  const date = finishedOnSchema.safeParse(finishedOn);
  if (!date.success) return { ok: false, error: firstError(date.error) };

  const [supabase, completed] = await Promise.all([
    requireUser(),
    challengesCompletedBy(id.data, date.data),
  ]);
  const { data, error } = await supabase.rpc("mark_book_read", {
    p_book_id: id.data,
    p_finished_on: date.data,
  });
  if (error || data === null) return failed(error);
  refreshScreens();
  return { ok: true, data: { readId: data, completed } };
}

/** Undo for markBookRead: removes that read and restores the previous state. */
export async function undoMarkBookRead(
  readId: number,
  previous: PreviousBookState,
): Promise<ActionResult> {
  if (!Number.isSafeInteger(readId) || readId < 1)
    return { ok: false, error: "unknown" };
  const status = previous ? bookStatusSchema.safeParse(previous.status) : null;
  if (status && !status.success) return { ok: false, error: "unknown" };

  const supabase = await requireUser();
  const { error } = await supabase.rpc("undo_mark_book_read", {
    p_read_id: readId,
    p_previous_status: status?.data,
    p_previous_progress:
      previous?.progress === null || previous?.progress === undefined
        ? undefined
        : previous.progress,
  });
  if (error) return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}

/**
 * Undo for setBookStatus: puts back the previous status, or takes the book off the shelf
 * when it was not there before.
 */
export async function restoreBookStatus(
  bookId: string,
  previous: PreviousBookState,
): Promise<ActionResult> {
  if (!previous) {
    const id = bookIdSchema.safeParse(bookId);
    if (!id.success) return { ok: false, error: "unknown" };
    const supabase = await requireUser();
    const { error } = await supabase
      .from("user_books")
      .delete()
      .eq("book_id", id.data);
    if (error) return failed(error);
    refreshScreens();
    return { ok: true, data: undefined };
  }
  if (previous.status === "read") {
    // A status change away from Read keeps the reads, so only the status needs restoring.
    const id = bookIdSchema.safeParse(bookId);
    if (!id.success) return { ok: false, error: "unknown" };
    const supabase = await requireUser();
    const { error } = await supabase
      .from("user_books")
      .update({ status: "read", progress: null })
      .eq("book_id", id.data);
    if (error) return failed(error);
    refreshScreens();
    return { ok: true, data: undefined };
  }
  return setBookStatus(bookId, previous.status, previous.progress);
}

/** "Remove from my books" (B3, D2): returns what was removed, for Undo. */
export async function removeMyBook(
  bookId: string,
): Promise<ActionResult<RemovedBookSnapshot>> {
  const id = bookIdSchema.safeParse(bookId);
  if (!id.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { data, error } = await supabase.rpc("remove_my_book", {
    p_book_id: id.data,
  });
  if (error || !data) return failed(error);
  refreshScreens();
  return { ok: true, data: data as unknown as RemovedBookSnapshot };
}

/** Undo for removeMyBook. */
export async function restoreMyBook(
  bookId: string,
  snapshot: RemovedBookSnapshot,
): Promise<ActionResult> {
  const id = bookIdSchema.safeParse(bookId);
  const status = bookStatusSchema.safeParse(snapshot?.status);
  if (!id.success || !status.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { error } = await supabase.rpc("restore_my_book", {
    p_book_id: id.data,
    p_snapshot: snapshot,
  });
  if (error) return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}

/** Only same-site paths, so `returnTo` cannot send people to another website. */
function safeReturnTo(value: FormDataEntryValue | null) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : null;
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Add a book manually (D3). Goes to the new book's page, or back to `returnTo`
 * (e.g. onboarding) with `added=<book id>`.
 */
export async function addManualBook(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = manualBookSchema.safeParse({
    title: field(formData, "title"),
    author: field(formData, "author"),
    isbn: field(formData, "isbn"),
    description: field(formData, "description"),
    status: field(formData, "status") || "want_to_read",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await requireUser();
  const { data: bookId, error } = await supabase.rpc("add_manual_book", {
    p_title: parsed.data.title,
    p_authors: [parsed.data.author],
    p_status: parsed.data.status,
    p_isbn: parsed.data.isbn ?? undefined,
    p_description: parsed.data.description ?? undefined,
  });
  if (error || !bookId) {
    console.error(error);
    return { error: "unknown" };
  }

  // From a search opened on a readlist (P45): the new book goes in that readlist too.
  const readlist = readlistIdSchema.safeParse(formData.get("readlistId"));
  if (readlist.success) {
    const { error: addError } = await supabase
      .from("readlist_books")
      .insert({ readlist_id: readlist.data, book_id: bookId });
    if (addError) console.error(addError);
  }

  refreshScreens();
  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (returnTo) {
    const url = new URL(returnTo, "http://local");
    url.searchParams.set("added", bookId);
    redirect(`${url.pathname}${url.search}`, RedirectType.replace);
  }
  if (readlist.success)
    redirect(`/readlists/${readlist.data}`, RedirectType.replace);
  // Replace the form in the history, so back from the new book goes to where the form came from.
  redirect(`/books/${bookId}`, RedirectType.replace);
}
