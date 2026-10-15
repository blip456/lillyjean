import "server-only";

import { createClient } from "@/lib/supabase/server";

export type BookReadlist = { id: string; name: string };

/**
 * The signed-in reader's readlists that contain the book, A–Z ("In your readlists" on the book
 * page, D2). One small query: only ids and names, no covers or counts.
 */
export async function getReadlistsWithBook(
  bookId: string,
): Promise<BookReadlist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readlist_books")
    .select("readlists(id, name)")
    .eq("book_id", bookId);
  if (error) console.error(error);
  return (data ?? [])
    .flatMap((row) => (row.readlists ? [row.readlists] : []))
    .sort((a, b) => a.name.localeCompare(b.name));
}
