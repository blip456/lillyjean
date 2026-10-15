import { shelfHref, shelfSlug, shelfStatus } from "./shelves";
import {
  BOOK_STATUSES,
  type BookStatus,
  SEARCH_FIELDS,
  type SearchField,
} from "./types";
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "./validation";

/**
 * URLs of the book screens. The search keeps its state in the URL (`/books/search?q=&field=`),
 * so back, refresh and a shared link show the same results (D1).
 *
 * The search also remembers the page it was opened from (P45): `?add=reading` from a shelf list,
 * `?readlist=<id>` from a readlist. Adding a book then does what that page is about.
 */

/** What adding a book from the search does: give it a status, or put it in a readlist. */
export type SearchTarget =
  | { kind: "status"; status: BookStatus }
  | { kind: "readlist"; readlistId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Param = string | string[] | undefined;

function first(value: Param) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export const SEARCH_PATH = "/books/search";

/** The page the search was opened from, or null (plain search: Want to read). */
export function readSearchTarget(params: {
  add?: Param;
  readlist?: Param;
}): SearchTarget | null {
  const readlistId = first(params.readlist);
  if (UUID.test(readlistId)) return { kind: "readlist", readlistId };
  const status = shelfStatus(first(params.add));
  return status ? { kind: "status", status } : null;
}

/** Search text, filter and target from the page's searchParams; unknown filters fall back to All. */
export function readSearchParams(params: {
  q?: Param;
  field?: Param;
  add?: Param;
  readlist?: Param;
}): {
  query: string;
  field: SearchField;
  target: SearchTarget | null;
} {
  const field = first(params.field);
  return {
    query: first(params.q).slice(0, SEARCH_MAX_LENGTH),
    field: (SEARCH_FIELDS as readonly string[]).includes(field)
      ? (field as SearchField)
      : "all",
    target: readSearchTarget(params),
  };
}

/** The URL parameters that carry a target (`add=` or `readlist=`). */
export function targetParams(target: SearchTarget | null | undefined) {
  if (!target) return {};
  return target.kind === "readlist"
    ? { readlist: target.readlistId }
    : { add: shelfSlug(target.status) };
}

/** Where back leads from a search with a target: the shelf list or the readlist. */
export function targetHref(target: SearchTarget | null) {
  if (!target) return "/";
  return target.kind === "readlist"
    ? `/readlists/${target.readlistId}`
    : shelfHref(target.status);
}

/** True when the text is long enough to search for; shorter text shows an empty list. */
export function isSearchable(query: string) {
  return query.trim().length >= SEARCH_MIN_LENGTH;
}

/** `/books/search` with only the parts that differ from the default (no text, All, no target). */
export function searchHref(
  query: string,
  field: SearchField = "all",
  target: SearchTarget | null = null,
) {
  const params = new URLSearchParams();
  const text = query.trim();
  if (text) params.set("q", text);
  if (field !== "all") params.set("field", field);
  for (const [key, value] of Object.entries(targetParams(target)))
    params.set(key, value);
  const search = params.toString();
  return search ? `${SEARCH_PATH}?${search}` : SEARCH_PATH;
}

/**
 * "Can't find it? Add it manually" (D1 → D3): the search text becomes the title, and the
 * target picks the status (`?status=`) or the readlist the new book goes in (`?readlist=`).
 */
export function manualEntryHref(
  query: string,
  returnTo?: string | null,
  target: SearchTarget | null = null,
) {
  const params = new URLSearchParams();
  const title = query.trim();
  if (title) params.set("title", title);
  if (returnTo) params.set("returnTo", returnTo);
  if (target?.kind === "status") params.set("status", target.status);
  if (target?.kind === "readlist") params.set("readlist", target.readlistId);
  const search = params.toString();
  return search ? `/books/new?${search}` : "/books/new";
}

/** The status a manual entry starts with: `?status=` when valid, otherwise Want to read. */
export function manualEntryStatus(value: Param): BookStatus {
  const status = first(value);
  return (BOOK_STATUSES as readonly string[]).includes(status)
    ? (status as BookStatus)
    : "want_to_read";
}

/** The readlist a manual entry also goes in (`?readlist=`), or null. */
export function manualEntryReadlist(value: Param): string | null {
  const id = first(value);
  return UUID.test(id) ? id : null;
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
 * back to the search the title came from (with the same target).
 */
export function addBookCloseHref(
  returnTo: string | null,
  title: string,
  target: SearchTarget | null = null,
) {
  return safeReturnTo(returnTo) ?? searchHref(title, "all", target);
}
