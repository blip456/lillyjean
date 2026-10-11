import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { fetchBookDetails, searchExternalBooks } from "./providers";
import type {
  BookDetail,
  BookListItem,
  BookStatus,
  ExternalBook,
  SearchField,
} from "./types";
import { SEARCH_MIN_LENGTH } from "./validation";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type BookRow = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
};

type ShelfRow = {
  book_id: string;
  status: BookStatus;
  progress: number | null;
};

function toListItem(
  book: BookRow,
  shelf: ShelfRow | undefined,
  readCount: number,
): BookListItem {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    coverUrl: book.cover_url,
    status: shelf?.status ?? null,
    progress: shelf?.progress ?? null,
    readCount,
  };
}

/** The signed-in user's status and read count for the given books. */
async function myStateFor(supabase: Supabase, bookIds: string[]) {
  if (bookIds.length === 0)
    return {
      shelf: new Map<string, ShelfRow>(),
      reads: new Map<string, number>(),
    };

  const [{ data: shelf }, { data: reads }] = await Promise.all([
    supabase
      .from("user_books")
      .select("book_id, status, progress")
      .in("book_id", bookIds),
    supabase.from("reads").select("book_id").in("book_id", bookIds),
  ]);

  const readCounts = new Map<string, number>();
  for (const read of reads ?? [])
    readCounts.set(read.book_id, (readCounts.get(read.book_id) ?? 0) + 1);

  return {
    shelf: new Map((shelf ?? []).map((row) => [row.book_id, row])),
    reads: readCounts,
  };
}

function toRpcBook(book: ExternalBook) {
  return {
    source: book.source,
    source_id: book.sourceId,
    title: book.title,
    authors: book.authors,
    description: book.description,
    cover_url: book.coverUrl,
    isbn: book.isbn,
    published_year: book.publishedYear,
    google_rating: book.googleRating,
    google_ratings_count: book.googleRatingsCount,
  };
}

/**
 * Book search (D1, A10): asks the book databases, saves the results in our `books` table (T3)
 * and adds the user's own status to each result. Short queries return nothing.
 * Throws BookSearchUnavailableError when no book database answers.
 */
export async function searchBooks(
  query: string,
  field: SearchField = "all",
): Promise<BookListItem[]> {
  const text = query.trim();
  if (text.length < SEARCH_MIN_LENGTH) return [];

  const found = await searchExternalBooks(text, field);
  if (found.length === 0) return [];

  const supabase = await createClient();
  const { data: ids, error } = await supabase.rpc("save_external_books", {
    p_books: found.slice(0, 40).map(toRpcBook),
  });
  if (error || !ids) throw error ?? new Error("save_external_books failed");

  const unique = [...new Set(ids)];
  const [{ data: books }, state] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, authors, cover_url")
      .in("id", unique),
    myStateFor(supabase, unique),
  ]);
  const byId = new Map((books ?? []).map((book) => [book.id, book]));

  return unique
    .map((id) => byId.get(id))
    .filter((book): book is BookRow => Boolean(book))
    .map((book) =>
      toListItem(book, state.shelf.get(book.id), state.reads.get(book.id) ?? 0),
    );
}

/**
 * One book with the user's status (D2). The first time a book from a book database is opened,
 * its description and Google rating are looked up and saved for everyone.
 * Returns null when the book does not exist.
 */
export const getBook = cache(async (id: string): Promise<BookDetail | null> => {
  const supabase = await createClient();
  const { data: found } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!found) return null;

  let book = found;
  if (!book.details_checked && book.source !== "manual" && book.source_id) {
    const details = await fetchBookDetails({
      source: book.source,
      sourceId: book.source_id,
      title: book.title,
      authors: book.authors,
      isbn: book.isbn,
    });
    await supabase.rpc("save_external_book", {
      p_source: book.source,
      p_source_id: book.source_id,
      p_title: book.title,
      p_description: details.description ?? undefined,
      p_cover_url: details.coverUrl ?? undefined,
      p_isbn: details.isbn ?? undefined,
      p_google_rating: details.googleRating ?? undefined,
      p_google_ratings_count: details.googleRatingsCount ?? undefined,
      p_details_checked: true,
    });
    const { data: refreshed } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .single();
    if (refreshed) book = refreshed;
  }

  const [{ data: shelf }, { data: reads }] = await Promise.all([
    supabase
      .from("user_books")
      .select("book_id, status, progress")
      .eq("book_id", id)
      .maybeSingle(),
    supabase
      .from("reads")
      .select("finished_on")
      .eq("book_id", id)
      .order("finished_on", { ascending: false }),
  ]);

  return {
    ...toListItem(book, shelf ?? undefined, reads?.length ?? 0),
    source: book.source,
    description: book.description,
    isbn: book.isbn,
    publishedYear: book.published_year,
    googleRating: book.google_rating,
    googleRatingsCount: book.google_ratings_count,
    lastFinishedOn: reads?.[0]?.finished_on ?? null,
  };
});

/** The user's books with one status, most recently changed first (Home, + menu, lists). */
export async function getMyBooks(
  status: BookStatus,
  limit = 50,
): Promise<BookListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_books")
    .select("book_id, status, progress, books(id, title, authors, cover_url)")
    .eq("status", status)
    .order("status_changed_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []).filter((row) => row.books);
  const { reads } = await myStateFor(
    supabase,
    rows.map((row) => row.book_id),
  );
  return rows.map((row) =>
    toListItem(row.books!, row, reads.get(row.book_id) ?? 0),
  );
}

/** Books the user finished in a calendar year, re-reads included (Home stats, pledge). */
export async function countBooksRead(year: number): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("reads")
    .select("id", { count: "exact", head: true })
    .gte("finished_on", `${year}-01-01`)
    .lte("finished_on", `${year}-12-31`);
  return count ?? 0;
}
