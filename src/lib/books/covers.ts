/**
 * Which cover URL to show for a book (T20): the stored copy in our public `covers` bucket when
 * there is one (fast, cached for a year), otherwise the original from the book database.
 */
export const COVERS_BUCKET = "covers";

export function storedCoverUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${COVERS_BUCKET}/${path}`;
}

export function coverUrlFor(book: {
  cover_path?: string | null;
  cover_url: string | null;
}): string | null {
  return book.cover_path ? storedCoverUrl(book.cover_path) : book.cover_url;
}
