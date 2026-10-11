import { z } from "zod";

import { MAX_TITLE_LENGTH, normalizeIsbn } from "./sanitize";
import { BOOK_STATUSES, SEARCH_FIELDS } from "./types";

/**
 * Input rules for books. Messages are translation keys under `errors` in messages/en.json.
 */

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 200;
export const MANUAL_DESCRIPTION_MAX_LENGTH = 2000;

export const bookIdSchema = z.uuid({ error: "unknown" });
export const bookStatusSchema = z.enum(BOOK_STATUSES, { error: "unknown" });
export const searchFieldSchema = z.enum(SEARCH_FIELDS).catch("all");

export const searchQuerySchema = z
  .string()
  .trim()
  .max(SEARCH_MAX_LENGTH, { error: "searchTooLong" });

/** Optional percentage while reading (P16): a whole number from 0 to 100, or empty. */
export const progressSchema = z
  .number({ error: "progressInvalid" })
  .int({ error: "progressInvalid" })
  .min(0, { error: "progressInvalid" })
  .max(100, { error: "progressInvalid" })
  .nullable();

/** YYYY-MM-DD in the reader's own calendar. */
export function localDate(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Finish date for "Mark as read" (D-PO1: asked, default today). Empty means today. Not in the
 * future; the server allows one extra day because the reader's "today" can be ahead of UTC.
 */
export const finishedOnSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return localDate();
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      ctx.addIssue({ code: "custom", message: "finishedOnInvalid" });
      return z.NEVER;
    }
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (value > tomorrow.toISOString().slice(0, 10)) {
      ctx.addIssue({ code: "custom", message: "finishedOnFuture" });
      return z.NEVER;
    }
    if (value < "1900-01-01") {
      ctx.addIssue({ code: "custom", message: "finishedOnInvalid" });
      return z.NEVER;
    }
    return value;
  });

const optionalText = (max: number, error: string) =>
  z
    .string()
    .trim()
    .max(max, { error })
    .transform((value) => value || null);

/** Add a book manually (D3, D-PO2: title and author are required). */
export const manualBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "titleRequired" })
    .max(MAX_TITLE_LENGTH, { error: "titleTooLong" }),
  // One author field; "and" or commas are kept as typed (one string is one author).
  author: z
    .string()
    .trim()
    .min(1, { error: "authorRequired" })
    .max(200, { error: "authorTooLong" }),
  isbn: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const isbn = normalizeIsbn(value);
      if (!isbn) {
        ctx.addIssue({ code: "custom", message: "isbnInvalid" });
        return z.NEVER;
      }
      return isbn;
    }),
  description: optionalText(
    MANUAL_DESCRIPTION_MAX_LENGTH,
    "descriptionTooLong",
  ),
  status: bookStatusSchema,
});

export type ManualBookInput = z.infer<typeof manualBookSchema>;
