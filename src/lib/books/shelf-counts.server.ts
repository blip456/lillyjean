import "server-only";

import { createClient } from "@/lib/supabase/server";

import { BOOK_STATUSES, type BookStatus } from "./types";

/**
 * How many of the signed-in user's books have each status: the three system lists on the
 * Readlists overview (C1). Row level security keeps the counts to the user's own shelf.
 */
export async function countMyShelves(): Promise<Record<BookStatus, number>> {
  const supabase = await createClient();
  const counts = await Promise.all(
    BOOK_STATUSES.map(async (status) => {
      const { count } = await supabase
        .from("user_books")
        .select("book_id", { count: "exact", head: true })
        .eq("status", status);
      return [status, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as Record<BookStatus, number>;
}
