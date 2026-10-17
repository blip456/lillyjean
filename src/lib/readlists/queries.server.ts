import "server-only";

import { cache } from "react";

import { coverUrlFor } from "@/lib/books/covers";
import { queueMissingCovers } from "@/lib/books/covers.server";
import {
  BOOK_WITH_MY_STATE,
  type BookWithMyState,
  toListItemWithState,
} from "@/lib/books/queries.server";
import { createClient } from "@/lib/supabase/server";

import type { ReadlistDetail, ReadlistSummary } from "./types";

const MOSAIC_SIZE = 4;

type MosaicBook = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  cover_path: string | null;
};

/**
 * The signed-in user's readlists, most recently changed first (C1, Home row, pickers), with the
 * book count and up to four covers for the mosaic. `limit` caps the number of lists. One query:
 * the books of each list are embedded, most recently added first.
 */
export async function getMyReadlists(limit = 200): Promise<ReadlistSummary[]> {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("readlists")
    .select(
      "id, name, description, updated_at, readlist_books(added_at, books(id, title, authors, cover_url, cover_path))",
    )
    .order("updated_at", { ascending: false })
    .order("added_at", { referencedTable: "readlist_books", ascending: false })
    .limit(limit);
  if (!lists?.length) return [];

  const mosaicBooks = (list: (typeof lists)[number]) =>
    list.readlist_books
      .map((entry) => entry.books as MosaicBook | null)
      .filter((book) => book !== null)
      .slice(0, MOSAIC_SIZE);

  queueMissingCovers(lists.flatMap(mosaicBooks));

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    bookCount: list.readlist_books.length,
    mosaic: mosaicBooks(list).map((book) => ({
      title: book.title,
      coverUrl: coverUrlFor(book),
    })),
    updatedAt: list.updated_at,
  }));
}

/**
 * One readlist with its books (C2), most recently added first (P40). Null when not found. The list
 * and its books (with the user's status and read count) load in parallel.
 */
export const getReadlist = cache(
  async (id: string): Promise<ReadlistDetail | null> => {
    const supabase = await createClient();
    const [{ data: list }, { data: entries }] = await Promise.all([
      supabase
        .from("readlists")
        .select("id, name, description, updated_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("readlist_books")
        .select(`added_at, books(${BOOK_WITH_MY_STATE})`)
        .eq("readlist_id", id)
        .order("added_at", { ascending: false }),
    ]);
    if (!list) return null;

    const rows = (entries ?? []).flatMap((row) => {
      const book = row.books as BookWithMyState | null;
      return book ? [{ book, addedAt: row.added_at }] : [];
    });
    queueMissingCovers(rows.map((row) => row.book));
    const books = rows.map(({ book, addedAt }) => ({
      ...toListItemWithState(book),
      addedAt,
    }));

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      bookCount: books.length,
      mosaic: books
        .slice(0, MOSAIC_SIZE)
        .map((book) => ({ title: book.title, coverUrl: book.coverUrl })),
      updatedAt: list.updated_at,
      books,
    };
  },
);

/** Ids of the user's readlists that contain the book (C4 ticks, "In your readlists" on D2). */
export async function getReadlistIdsForBook(bookId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("readlist_books")
    .select("readlist_id")
    .eq("book_id", bookId);
  return (data ?? []).map((row) => row.readlist_id);
}
