/** "View on Goodreads" (P5): by ISBN when known, otherwise a search for title and author. */
export function goodreadsUrl(book: {
  isbn: string | null;
  title: string;
  authors: string[];
}) {
  if (book.isbn) return `https://www.goodreads.com/book/isbn/${book.isbn}`;
  const q = [book.title, book.authors[0]].filter(Boolean).join(" ");
  return `https://www.goodreads.com/search?${new URLSearchParams({ q })}`;
}
