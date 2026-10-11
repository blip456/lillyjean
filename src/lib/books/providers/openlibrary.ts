import {
  cleanAuthors,
  cleanCoverUrl,
  cleanDescription,
  cleanText,
  cleanYear,
  looksLikeIsbn,
  MAX_TITLE_LENGTH,
  normalizeIsbn,
  pickIsbn,
} from "../sanitize";
import type { BookDetails, ExternalBook, SearchField } from "../types";

/** Open Library (CC0), the primary book database (T3). https://openlibrary.org/developers/api */
const BASE_URL = "https://openlibrary.org";
const FIELDS = "key,title,subtitle,author_name,cover_i,first_publish_year,isbn";

export function openLibrarySearchUrl(
  query: string,
  field: SearchField,
  limit = 20,
) {
  const params = new URLSearchParams({ fields: FIELDS, limit: String(limit) });
  const isbn = normalizeIsbn(query);
  if (isbn && looksLikeIsbn(query)) params.set("isbn", isbn);
  else if (field === "title") params.set("title", query);
  else if (field === "author") params.set("author", query);
  else params.set("q", query);
  return `${BASE_URL}/search.json?${params}`;
}

export function openLibraryCoverUrl(coverId: unknown, size: "M" | "L" = "M") {
  return typeof coverId === "number" && coverId > 0
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
    : null;
}

type SearchDoc = {
  key?: unknown;
  title?: unknown;
  subtitle?: unknown;
  author_name?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
  isbn?: unknown;
};

/** Maps one search result; returns null for results that are not usable works. */
export function mapOpenLibraryDoc(doc: SearchDoc): ExternalBook | null {
  const key = typeof doc.key === "string" ? doc.key : "";
  const sourceId = key.match(/^\/works\/(OL\d+W)$/)?.[1];
  const title = cleanText(doc.title, MAX_TITLE_LENGTH);
  if (!sourceId || !title) return null;

  return {
    source: "openlibrary",
    sourceId,
    title,
    authors: cleanAuthors(doc.author_name),
    description: null,
    coverUrl: cleanCoverUrl(openLibraryCoverUrl(doc.cover_i)),
    isbn: pickIsbn(Array.isArray(doc.isbn) ? doc.isbn.slice(0, 50) : null),
    publishedYear: cleanYear(doc.first_publish_year),
    googleRating: null,
    googleRatingsCount: null,
  };
}

export function mapOpenLibrarySearch(body: unknown): ExternalBook[] {
  const docs = (body as { docs?: unknown })?.docs;
  if (!Array.isArray(docs)) return [];
  return docs
    .map((doc) => mapOpenLibraryDoc(doc as SearchDoc))
    .filter((book): book is ExternalBook => book !== null);
}

export function openLibraryWorkUrl(sourceId: string) {
  return `${BASE_URL}/works/${encodeURIComponent(sourceId)}.json`;
}

/** The work record has the description (a string or `{ value }`) and cover ids. */
export function mapOpenLibraryWork(
  body: unknown,
): Pick<BookDetails, "description" | "coverUrl"> {
  const work = (body ?? {}) as { description?: unknown; covers?: unknown };
  const description =
    typeof work.description === "object" && work.description !== null
      ? (work.description as { value?: unknown }).value
      : work.description;
  const covers = Array.isArray(work.covers) ? work.covers : [];
  return {
    description: cleanDescription(description),
    coverUrl: cleanCoverUrl(openLibraryCoverUrl(covers.find((id) => id > 0))),
  };
}
