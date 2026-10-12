import type { BookStatus } from "./types";

/** URL slugs of the shelf lists: /books/shelf/want-to-read, /reading, /read. */
const SHELF_SLUGS = {
  "want-to-read": "want_to_read",
  reading: "reading",
  read: "read",
} as const satisfies Record<string, BookStatus>;

/** The status for a shelf slug, or null for anything else (→ 404). */
export function shelfStatus(slug: string): BookStatus | null {
  return Object.hasOwn(SHELF_SLUGS, slug)
    ? SHELF_SLUGS[slug as keyof typeof SHELF_SLUGS]
    : null;
}

export function shelfHref(status: BookStatus) {
  return `/books/shelf/${status.replaceAll("_", "-")}`;
}
