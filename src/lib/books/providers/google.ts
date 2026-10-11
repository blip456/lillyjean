import {
  cleanAuthors,
  cleanCount,
  cleanCoverUrl,
  cleanDescription,
  cleanRating,
  cleanText,
  cleanYear,
  looksLikeIsbn,
  MAX_TITLE_LENGTH,
  normalizeIsbn,
  pickIsbn,
} from "../sanitize";
import type { ExternalBook, SearchField } from "../types";

/**
 * Google Books, the fallback book database (T3) and the source of the Google rating (P17).
 * Works without a key at a low shared quota; set GOOGLE_BOOKS_API_KEY for a higher one.
 */
const BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const FIELDS =
  "items(id,volumeInfo(title,subtitle,authors,description,imageLinks/thumbnail,industryIdentifiers,publishedDate,averageRating,ratingsCount))";

/** Removes characters that have a meaning in Google's query syntax. */
function term(value: string) {
  return value.replace(/["+:]/g, " ").replace(/\s+/g, " ").trim();
}

export function googleQuery(query: string, field: SearchField) {
  const isbn = normalizeIsbn(query);
  if (isbn && looksLikeIsbn(query)) return `isbn:${isbn}`;
  if (field === "title") return `intitle:${term(query)}`;
  if (field === "author") return `inauthor:${term(query)}`;
  return term(query);
}

export function googleSearchUrl(q: string, apiKey?: string, limit = 20) {
  const params = new URLSearchParams({
    q,
    maxResults: String(limit),
    printType: "books",
    fields: FIELDS,
  });
  if (apiKey) params.set("key", apiKey);
  return `${BASE_URL}?${params}`;
}

/** Query used to find the Google rating for a book from another source. */
export function googleRatingQuery(book: {
  isbn: string | null;
  title: string;
  authors: string[];
}) {
  if (book.isbn) return `isbn:${book.isbn}`;
  const author = book.authors[0];
  return author
    ? `intitle:${term(book.title)} inauthor:${term(author)}`
    : `intitle:${term(book.title)}`;
}

type Volume = {
  id?: unknown;
  volumeInfo?: {
    title?: unknown;
    subtitle?: unknown;
    authors?: unknown;
    description?: unknown;
    imageLinks?: { thumbnail?: unknown };
    industryIdentifiers?: { type?: unknown; identifier?: unknown }[];
    publishedDate?: unknown;
    averageRating?: unknown;
    ratingsCount?: unknown;
  };
};

export function mapGoogleVolume(volume: Volume): ExternalBook | null {
  const info = volume.volumeInfo ?? {};
  const sourceId = typeof volume.id === "string" ? volume.id : "";
  const title = cleanText(info.title, MAX_TITLE_LENGTH);
  if (!/^[\w-]{1,40}$/.test(sourceId) || !title) return null;

  const identifiers = Array.isArray(info.industryIdentifiers)
    ? info.industryIdentifiers
        .map((id) => (typeof id.identifier === "string" ? id.identifier : ""))
        .filter(Boolean)
    : [];
  const thumbnail =
    typeof info.imageLinks?.thumbnail === "string"
      ? info.imageLinks.thumbnail.replace(/&edge=curl/g, "")
      : null;

  return {
    source: "google",
    sourceId,
    title,
    authors: cleanAuthors(info.authors),
    description: cleanDescription(info.description),
    coverUrl: cleanCoverUrl(thumbnail),
    isbn: pickIsbn(identifiers),
    publishedYear: cleanYear(
      typeof info.publishedDate === "string"
        ? info.publishedDate.slice(0, 4)
        : null,
    ),
    googleRating: cleanRating(info.averageRating),
    googleRatingsCount: cleanCount(info.ratingsCount),
  };
}

export function mapGoogleSearch(body: unknown): ExternalBook[] {
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => mapGoogleVolume(item as Volume))
    .filter((book): book is ExternalBook => book !== null);
}
