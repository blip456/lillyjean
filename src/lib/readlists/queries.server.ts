import "server-only";

import { cache } from "react";

import { coverUrlFor } from "@/lib/books/covers";
import { queueMissingCovers } from "@/lib/books/covers.server";
import { myStateFor, toListItem } from "@/lib/books/queries.server";
import { createClient } from "@/lib/supabase/server";

import type { ReadlistDetail, ReadlistSummary } from "./types";

const MOSAIC_SIZE = 4;

type EntryRow = {
  readlist_id: string;
  added_at: string;
  books: {
    id: string;
    title: string;
    authors: string[];
    cover_url: string | null;
    cover_path: string | null;
  } | null;
};

/**
 * The signed-in user's readlists, most recently changed first (C1, Home row, pickers), with the
 * book count and up to four covers for the mosaic. `limit` caps the number of lists.
 */
export async function getMyReadlists(limit = 200): Promise<ReadlistSummary[]> {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("readlists")
    .select("id, name, description, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (!lists?.length) return [];

  const { data: entries } = await supabase
    .from("readlist_books")
    .select(
      "readlist_id, added_at, books(id, title, authors, cover_url, cover_path)",
    )
    .in(
      "readlist_id",
      lists.map((list) => list.id),
    )
    .order("added_at", { ascending: false });

  const byList = new Map<string, EntryRow[]>();
  for (const entry of (entries ?? []) as EntryRow[]) {
    const rows = byList.get(entry.readlist_id) ?? [];
    rows.push(entry);
    byList.set(entry.readlist_id, rows);
  }

  queueMissingCovers(
    [...byList.values()].flatMap((rows) =>
      rows.flatMap((row) => row.books ?? []).slice(0, MOSAIC_SIZE),
    ),
  );

  return lists.map((list) => {
    const rows = byList.get(list.id) ?? [];
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      bookCount: rows.length,
      mosaic: rows
        .filter((row) => row.books)
        .slice(0, MOSAIC_SIZE)
        .map((row) => ({
          title: row.books!.title,
          coverUrl: coverUrlFor(row.books!),
        })),
      updatedAt: list.updated_at,
    };
  });
}

/** One readlist with its books (C2), most recently added first (P40). Null when not found. */
export const getReadlist = cache(
  async (id: string): Promise<ReadlistDetail | null> => {
    const supabase = await createClient();
    const { data: list } = await supabase
      .from("readlists")
      .select("id, name, description, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (!list) return null;

    const { data: entries } = await supabase
      .from("readlist_books")
      .select(
        "readlist_id, added_at, books(id, title, authors, cover_url, cover_path)",
      )
      .eq("readlist_id", id)
      .order("added_at", { ascending: false });

    const rows = ((entries ?? []) as EntryRow[]).filter((row) => row.books);
    queueMissingCovers(rows.map((row) => row.books!));
    const state = await myStateFor(
      supabase,
      rows.map((row) => row.books!.id),
    );
    const books = rows.map((row) => ({
      ...toListItem(
        row.books!,
        state.shelf.get(row.books!.id),
        state.reads.get(row.books!.id) ?? 0,
      ),
      addedAt: row.added_at,
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
