"use server";

import { redirect } from "next/navigation";

import { bookIdSchema } from "@/lib/books/validation";
import { createClient } from "@/lib/supabase/server";

import { getMyReadlists, getReadlistIdsForBook } from "./queries.server";
import type { ReadlistSummary } from "./types";

export type AddToReadlistData = {
  /** The reader's readlists, most recently changed first. */
  readlists: ReadlistSummary[];
  /** The ones that contain the book (ticked). */
  selectedIds: string[];
};

/**
 * What the add-to-readlist sheet (C4) shows when it opens: the reader's readlists and which of
 * them contain the book. Loaded on opening rather than with every page that lists books.
 */
export async function loadAddToReadlist(
  bookId: string,
): Promise<AddToReadlistData> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/welcome");

  const book = bookIdSchema.safeParse(bookId);
  if (!book.success) return { readlists: [], selectedIds: [] };

  const [readlists, ids] = await Promise.all([
    getMyReadlists(),
    getReadlistIdsForBook(book.data),
  ]);
  const listed = new Set(readlists.map((list) => list.id));
  return { readlists, selectedIds: ids.filter((id) => listed.has(id)) };
}
