"use server";

import { redirect } from "next/navigation";

import type { BookListItem } from "@/lib/books/types";
import { getMyReadlists, getReadlist } from "@/lib/readlists/queries.server";
import type { ReadlistSummary } from "@/lib/readlists/types";
import { readlistIdSchema } from "@/lib/readlists/validation";
import { createClient } from "@/lib/supabase/server";

/**
 * Read-only loaders for "Import from a readlist" in the challenge form (E6, E8). Loaded when the
 * sheet opens rather than with the form page.
 */

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/welcome");
}

/** My readlists, most recently changed first. */
export async function loadReadlistsForImport(): Promise<ReadlistSummary[]> {
  await requireUser();
  return getMyReadlists();
}

/** The books of one of my readlists, in the readlist's order; null when it is not found. */
export async function loadReadlistBooks(
  readlistId: string,
): Promise<BookListItem[] | null> {
  await requireUser();
  const id = readlistIdSchema.safeParse(readlistId);
  if (!id.success) return null;
  const readlist = await getReadlist(id.data);
  return readlist?.books ?? null;
}
