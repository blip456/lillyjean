/**
 * Cleans data from the book databases so it always fits the `books` table constraints
 * (supabase/migrations/20261012090000_books.sql).
 */

export const MAX_TITLE_LENGTH = 300;
export const MAX_AUTHORS = 20;
export const MAX_DESCRIPTION_LENGTH = 10000;

/** Strips separators and checks the ISBN-10 / ISBN-13 checksum; returns null when invalid. */
export function normalizeIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();

  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn]
      .slice(0, 12)
      .reduce((acc, digit, i) => acc + Number(digit) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(isbn[12]) ? isbn : null;
  }

  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (acc, char, i) => acc + (char === "X" ? 10 : Number(char)) * (10 - i),
      0,
    );
    return sum % 11 === 0 ? isbn : null;
  }

  return null;
}

/** True when the search text is an ISBN, so the search should look it up as one. */
export function looksLikeIsbn(query: string) {
  return normalizeIsbn(query) !== null;
}

/** Picks the best ISBN from a list: a valid ISBN-13 first, then a valid ISBN-10. */
export function pickIsbn(values: readonly string[] | null | undefined) {
  const valid = (values ?? []).map(normalizeIsbn).filter(Boolean) as string[];
  return valid.find((isbn) => isbn.length === 13) ?? valid[0] ?? null;
}

export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** Keeps paragraphs, drops HTML tags (Google Books) and the "----------" source blocks (Open Library). */
export function cleanDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .split(/\n-{3,}/)[0]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return text.length > MAX_DESCRIPTION_LENGTH
    ? `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
    : text;
}

export function cleanAuthors(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const authors = values
    .map((author) => cleanText(author, 200))
    .filter((author): author is string => Boolean(author));
  return [...new Set(authors)].slice(0, MAX_AUTHORS);
}

/** Only https URLs are stored (the column requires it); http is upgraded. */
export function cleanCoverUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const url = value.replace(/^http:\/\//, "https://");
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function cleanYear(value: unknown): number | null {
  const year =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""));
  return Number.isInteger(year) && year > 0 && year <= 3000 ? year : null;
}

export function cleanRating(value: unknown): number | null {
  return typeof value === "number" && value >= 0 && value <= 5
    ? Math.round(value * 10) / 10
    : null;
}

export function cleanCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
