import { SEARCH_FIELDS, type SearchField } from "./types";
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "./validation";

/**
 * URLs of the book screens. The search keeps its state in the URL (`/books/search?q=&field=`),
 * so back, refresh and a shared link show the same results (D1).
 */

type Param = string | string[] | undefined;

function first(value: Param) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export const SEARCH_PATH = "/books/search";

/** Search text and filter from the page's searchParams; unknown filters fall back to All. */
export function readSearchParams(params: { q?: Param; field?: Param }): {
  query: string;
  field: SearchField;
} {
  const field = first(params.field);
  return {
    query: first(params.q).slice(0, SEARCH_MAX_LENGTH),
    field: (SEARCH_FIELDS as readonly string[]).includes(field)
      ? (field as SearchField)
      : "all",
  };
}

/** True when the text is long enough to search for; shorter text shows an empty list. */
export function isSearchable(query: string) {
  return query.trim().length >= SEARCH_MIN_LENGTH;
}

/** `/books/search` with only the parts that differ from the default (no text, All). */
export function searchHref(query: string, field: SearchField = "all") {
  const params = new URLSearchParams();
  const text = query.trim();
  if (text) params.set("q", text);
  if (field !== "all") params.set("field", field);
  const search = params.toString();
  return search ? `${SEARCH_PATH}?${search}` : SEARCH_PATH;
}

/** "Can't find it? Add it manually" (D1 → D3): the search text becomes the title. */
export function manualEntryHref(query: string, returnTo?: string | null) {
  const params = new URLSearchParams();
  const title = query.trim();
  if (title) params.set("title", title);
  if (returnTo) params.set("returnTo", returnTo);
  const search = params.toString();
  return search ? `/books/new?${search}` : "/books/new";
}

/** Only same-site paths, so `returnTo` cannot send people to another website. */
export function safeReturnTo(value: unknown): string | null {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : null;
}

/**
 * Where × on "Add a book manually" (D3) goes: back to `returnTo` (e.g. onboarding), otherwise
 * back to the search the title came from.
 */
export function addBookCloseHref(returnTo: string | null, title: string) {
  return safeReturnTo(returnTo) ?? searchHref(title);
}
