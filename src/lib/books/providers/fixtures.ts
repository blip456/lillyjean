import type { BookDetails, ExternalBook, SearchField } from "../types";

/**
 * Offline book data for local development and the end-to-end checks (BOOKS_API=fixtures),
 * where the book databases cannot be reached. Never used in production.
 */
const book = (
  sourceId: string,
  title: string,
  authors: string[],
  publishedYear: number,
  isbn: string | null,
  googleRating: number | null,
  description: string,
): ExternalBook & { description: string } => ({
  source: "openlibrary",
  sourceId,
  title,
  authors,
  description,
  coverUrl: null,
  isbn,
  publishedYear,
  googleRating,
  googleRatingsCount: googleRating ? 120 : null,
});

export const FIXTURE_BOOKS = [
  book(
    "OL900001W",
    "Pride and Prejudice",
    ["Jane Austen"],
    1813,
    "9780141439518",
    4.3,
    "Elizabeth Bennet and Mr Darcy misjudge each other in Regency England.",
  ),
  book(
    "OL900002W",
    "Emma",
    ["Jane Austen"],
    1815,
    "9780141439587",
    4.0,
    "A young matchmaker learns that she understands other people less than she thinks.",
  ),
  book(
    "OL900003W",
    "Persuasion",
    ["Jane Austen"],
    1817,
    null,
    4.2,
    "Anne Elliot meets the man she was persuaded not to marry, eight years later.",
  ),
  book(
    "OL900004W",
    "Middlemarch",
    ["George Eliot"],
    1871,
    "9780141439549",
    3.9,
    "Lives and marriages in a provincial English town.",
  ),
  book(
    "OL900005W",
    "Jane Eyre",
    ["Charlotte Brontë"],
    1847,
    "9780141441146",
    4.1,
    "An orphaned governess finds independence and love at Thornfield Hall.",
  ),
  book(
    "OL900006W",
    "Wuthering Heights",
    ["Emily Brontë"],
    1847,
    "9780141439556",
    3.8,
    "A fierce love story on the Yorkshire moors.",
  ),
  book(
    "OL900007W",
    "Moby-Dick",
    ["Herman Melville"],
    1851,
    "9780142437247",
    3.5,
    "Captain Ahab hunts the white whale.",
  ),
  book(
    "OL900008W",
    "Little Women",
    ["Louisa May Alcott"],
    1868,
    "9780147514011",
    4.1,
    "Four sisters grow up during and after the American Civil War.",
  ),
  book(
    "OL900009W",
    "The Age of Innocence",
    ["Edith Wharton"],
    1920,
    null,
    null,
    "New York society in the 1870s and a marriage of convenience.",
  ),
  book(
    "OL900010W",
    "Frankenstein",
    ["Mary Shelley"],
    1818,
    "9780141439471",
    3.9,
    "A scientist creates life and runs from what he made.",
  ),
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchFixtures(
  query: string,
  field: SearchField,
): ExternalBook[] {
  const needle = normalize(query.replace(/[\s-]/g, " ").trim());
  const isbn = query.replace(/[\s-]/g, "");
  return FIXTURE_BOOKS.filter((book) => {
    if (book.isbn && book.isbn === isbn) return true;
    const title = normalize(book.title).includes(needle);
    const author = book.authors.some((a) => normalize(a).includes(needle));
    if (field === "title") return title;
    if (field === "author") return author;
    return title || author;
  }).map((book) => ({ ...book, description: null }));
}

export function fixtureDetails(sourceId: string): BookDetails | null {
  const book = FIXTURE_BOOKS.find((b) => b.sourceId === sourceId);
  if (!book) return null;
  return {
    description: book.description,
    googleRating: book.googleRating,
    googleRatingsCount: book.googleRatingsCount,
    coverUrl: null,
    isbn: book.isbn,
  };
}
