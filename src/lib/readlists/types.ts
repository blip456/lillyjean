import type { BookListItem } from "@/lib/books/types";

/** A readlist in the overview (C1), Home row and pickers: name, count and mosaic covers. */
export type ReadlistSummary = {
  id: string;
  name: string;
  description: string | null;
  bookCount: number;
  /** The first (most recently added) books, for the automatic 2×2 mosaic (P19). Up to four. */
  mosaic: { title: string; coverUrl: string | null }[];
  updatedAt: string;
};

/** One readlist with its books, most recently added first (C2, P40). */
export type ReadlistDetail = ReadlistSummary & {
  books: (BookListItem & { addedAt: string })[];
};

/** What "Remove from readlist" returns, so Undo puts the book back in its old place. */
export type RemovedReadlistBook = {
  readlistId: string;
  bookId: string;
  addedAt: string;
};
