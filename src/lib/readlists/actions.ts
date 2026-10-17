"use server";

import { redirect, RedirectType } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { bookIdSchema } from "@/lib/books/validation";
import { refreshScreens } from "@/lib/refresh-screens.server";
import { createClient } from "@/lib/supabase/server";

import type { ReadlistSummary, RemovedReadlistBook } from "./types";
import { readlistIdSchema, readlistSchema } from "./validation";

/**
 * Server Actions for readlists. The database checks ownership (RLS) and the rules
 * (supabase/migrations/20261015090000_readlists.sql). Errors are translation keys under `errors`.
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

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Only same-site paths, so `returnTo` cannot send people to another website. */
function safeReturnTo(value: string) {
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : null;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues)
    errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}

/**
 * Create a readlist (C3). Optional hidden fields: `bookId` adds that book straight away (C4 "New
 * readlist", + menu from a book), `returnTo` goes back there instead of opening the new list.
 */
export async function createReadlist(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = readlistSchema.safeParse({
    name: field(formData, "name"),
    description: field(formData, "description"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await requireUser();
  const { data: list, error } = await supabase
    .from("readlists")
    .insert({ name: parsed.data.name, description: parsed.data.description })
    .select("id")
    .single();
  if (error || !list) {
    console.error(error);
    return { error: "unknown" };
  }

  const bookId = bookIdSchema.safeParse(field(formData, "bookId"));
  if (bookId.success) {
    const { error: addError } = await supabase
      .from("readlist_books")
      .insert({ readlist_id: list.id, book_id: bookId.data });
    if (addError) console.error(addError);
  }

  refreshScreens();
  const returnTo = safeReturnTo(field(formData, "returnTo"));
  redirect(returnTo ?? `/readlists/${list.id}`, RedirectType.replace);
}

/** Rename or change the description (C3 in edit mode). Goes back to the readlist. */
export async function updateReadlist(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = readlistIdSchema.safeParse(field(formData, "id"));
  if (!id.success) return { error: "unknown" };
  const parsed = readlistSchema.safeParse({
    name: field(formData, "name"),
    description: field(formData, "description"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await requireUser();
  const { error } = await supabase
    .from("readlists")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", id.data);
  if (error) {
    console.error(error);
    return { error: "unknown" };
  }
  refreshScreens();
  redirect(`/readlists/${id.data}`, RedirectType.replace);
}

/** Delete a readlist (after a confirmation in the UI). The books stay on the shelf. */
export async function deleteReadlist(
  readlistId: string,
): Promise<ActionResult> {
  const id = readlistIdSchema.safeParse(readlistId);
  if (!id.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { error } = await supabase.from("readlists").delete().eq("id", id.data);
  if (error) return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}

/** Quick create from the add-to-readlist sheet (C4): creates the list with the book in it. */
export async function createReadlistWithBook(
  name: string,
  bookId: string,
): Promise<ActionResult<ReadlistSummary>> {
  const parsed = readlistSchema.safeParse({ name, description: "" });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "unknown" };
  const book = bookIdSchema.safeParse(bookId);
  if (!book.success) return { ok: false, error: "unknown" };

  const supabase = await requireUser();
  const { data: list, error } = await supabase
    .from("readlists")
    .insert({ name: parsed.data.name })
    .select("id, name, description, updated_at")
    .single();
  if (error || !list) return failed(error);
  const { error: addError } = await supabase
    .from("readlist_books")
    .insert({ readlist_id: list.id, book_id: book.data });
  if (addError) return failed(addError);

  refreshScreens();
  return {
    ok: true,
    data: {
      id: list.id,
      name: list.name,
      description: list.description,
      bookCount: 1,
      mosaic: [],
      updatedAt: list.updated_at,
    },
  };
}

/** Add a book to a readlist (C4 tick). Adding a book that is already there is not an error. */
export async function addBookToReadlist(
  readlistId: string,
  bookId: string,
): Promise<ActionResult> {
  const list = readlistIdSchema.safeParse(readlistId);
  const book = bookIdSchema.safeParse(bookId);
  if (!list.success || !book.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { error } = await supabase
    .from("readlist_books")
    .insert({ readlist_id: list.data, book_id: book.data });
  if (error && error.code !== "23505") return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}

/** Remove a book from a readlist (C4 untick, C2). Returns what Undo needs. */
export async function removeBookFromReadlist(
  readlistId: string,
  bookId: string,
): Promise<ActionResult<RemovedReadlistBook | null>> {
  const list = readlistIdSchema.safeParse(readlistId);
  const book = bookIdSchema.safeParse(bookId);
  if (!list.success || !book.success) return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("readlist_books")
    .delete()
    .eq("readlist_id", list.data)
    .eq("book_id", book.data)
    .select("readlist_id, book_id, added_at")
    .maybeSingle();
  if (error) return failed(error);
  refreshScreens();
  return {
    ok: true,
    data: data
      ? {
          readlistId: data.readlist_id,
          bookId: data.book_id,
          addedAt: data.added_at,
        }
      : null,
  };
}

/** Undo for removeBookFromReadlist: puts the book back at its old place in the list. */
export async function restoreBookInReadlist(
  removed: RemovedReadlistBook,
): Promise<ActionResult> {
  const list = readlistIdSchema.safeParse(removed?.readlistId);
  const book = bookIdSchema.safeParse(removed?.bookId);
  const addedAt = typeof removed?.addedAt === "string" ? removed.addedAt : null;
  if (
    !list.success ||
    !book.success ||
    !addedAt ||
    Number.isNaN(Date.parse(addedAt))
  )
    return { ok: false, error: "unknown" };
  const supabase = await requireUser();
  const { error } = await supabase
    .from("readlist_books")
    .insert({ readlist_id: list.data, book_id: book.data, added_at: addedAt });
  if (error && error.code !== "23505") return failed(error);
  refreshScreens();
  return { ok: true, data: undefined };
}
