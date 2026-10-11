import type { Database } from "@/lib/supabase/database.types";

export type BookStatus = Database["public"]["Enums"]["book_status"];
export type BookSource = Database["public"]["Enums"]["book_source"];

export const BOOK_STATUSES = [
  "want_to_read",
  "reading",
  "read",
] as const satisfies readonly BookStatus[];

/** Which part of a book the search text should match (D1 filter: All / Title / Author). */
export const SEARCH_FIELDS = ["all", "title", "author"] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];

/** A book as found in Open Library or Google Books, before it is saved in our `books` table. */
export type ExternalBook = {
  source: Exclude<BookSource, "manual">;
  sourceId: string;
  title: string;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  isbn: string | null;
  publishedYear: number | null;
  googleRating: number | null;
  googleRatingsCount: number | null;
};

/** Extra information looked up once when a book page is opened. */
export type BookDetails = {
  description: string | null;
  googleRating: number | null;
  googleRatingsCount: number | null;
  coverUrl: string | null;
  isbn: string | null;
};

/** A saved book with the signed-in user's status: search results, Home, lists. */
export type BookListItem = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  status: BookStatus | null;
  /** Optional percentage while reading (P16). */
  progress: number | null;
  /** How often the user finished this book; more than 0 makes "Read" a re-read (P28). */
  readCount: number;
};

/** Everything the book page (D2) shows. */
export type BookDetail = BookListItem & {
  source: BookSource;
  description: string | null;
  isbn: string | null;
  publishedYear: number | null;
  googleRating: number | null;
  googleRatingsCount: number | null;
  /** Most recent finish date (YYYY-MM-DD), if any. */
  lastFinishedOn: string | null;
};

/** What "Remove from my books" returns, so Undo can put it back. */
export type RemovedBookSnapshot = {
  status: BookStatus;
  progress: number | null;
  status_changed_at: string;
  created_at: string;
  reads: { finished_on: string; created_at: string }[];
};

/** The state before a status change, for Undo. `null` = the book was not on the shelf. */
export type PreviousBookState = {
  status: BookStatus;
  progress: number | null;
} | null;
