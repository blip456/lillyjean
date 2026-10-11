import type { BookDetails, ExternalBook, SearchField } from "../types";
import { fixtureDetails, searchFixtures } from "./fixtures";
import {
  googleQuery,
  googleRatingQuery,
  googleSearchUrl,
  mapGoogleSearch,
} from "./google";
import {
  mapOpenLibrarySearch,
  mapOpenLibraryWork,
  openLibrarySearchUrl,
  openLibraryWorkUrl,
} from "./openlibrary";

/** Both book databases failed; the app shows "Search is not available right now". */
export class BookSearchUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Book search is unavailable", { cause });
    this.name = "BookSearchUnavailableError";
  }
}

const TIMEOUT_MS = 6000;
/** Responses are cached for a day (Next.js data cache), which also protects the free quotas. */
const CACHE_SECONDS = 60 * 60 * 24;

function fixturesEnabled() {
  return process.env.BOOKS_API === "fixtures";
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      // Open Library asks clients to identify themselves.
      "User-Agent": "Lillyjean (https://github.com/blip456/lillyjean)",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function googleUrl(q: string, limit?: number) {
  return googleSearchUrl(
    q,
    process.env.GOOGLE_BOOKS_API_KEY || undefined,
    limit,
  );
}

/**
 * Searches Open Library first and Google Books when Open Library fails or finds nothing (T3).
 * Throws BookSearchUnavailableError only when neither database answers.
 */
export async function searchExternalBooks(
  query: string,
  field: SearchField,
): Promise<ExternalBook[]> {
  if (fixturesEnabled()) return searchFixtures(query, field);

  let openLibraryError: unknown;
  try {
    const books = mapOpenLibrarySearch(
      await getJson(openLibrarySearchUrl(query, field)),
    );
    if (books.length > 0) return books;
  } catch (error) {
    openLibraryError = error;
  }

  try {
    return mapGoogleSearch(await getJson(googleUrl(googleQuery(query, field))));
  } catch (error) {
    if (openLibraryError) throw new BookSearchUnavailableError(error);
    // Open Library answered (no results) and Google failed: report no results.
    console.error("Google Books search failed", error);
    return [];
  }
}

/**
 * Looks up what search results do not include: the description (Open Library work) and the
 * Google rating. Missing parts stay null; this never throws.
 */
export async function fetchBookDetails(book: {
  source: "openlibrary" | "google";
  sourceId: string;
  title: string;
  authors: string[];
  isbn: string | null;
}): Promise<BookDetails> {
  if (fixturesEnabled()) {
    return (
      fixtureDetails(book.sourceId) ?? {
        description: null,
        googleRating: null,
        googleRatingsCount: null,
        coverUrl: null,
        isbn: null,
      }
    );
  }

  const [work, google] = await Promise.allSettled([
    book.source === "openlibrary"
      ? getJson(openLibraryWorkUrl(book.sourceId)).then(mapOpenLibraryWork)
      : Promise.resolve(null),
    getJson(googleUrl(googleRatingQuery(book), 5)).then(mapGoogleSearch),
  ]);

  const fromWork = work.status === "fulfilled" ? work.value : null;
  const volumes = google.status === "fulfilled" ? google.value : [];
  const rated = volumes.find((volume) => volume.googleRating !== null);
  const first = volumes[0];

  return {
    description: fromWork?.description ?? first?.description ?? null,
    googleRating: rated?.googleRating ?? null,
    googleRatingsCount: rated?.googleRatingsCount ?? null,
    coverUrl: fromWork?.coverUrl ?? first?.coverUrl ?? null,
    isbn: first?.isbn ?? null,
  };
}
