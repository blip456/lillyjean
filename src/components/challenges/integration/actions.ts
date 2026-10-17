"use server";

import { bookIdSchema, finishedOnSchema } from "@/lib/books/validation";
import {
  challengesCompletedBy,
  countCompletedChallenges,
} from "@/lib/challenges/queries.server";
import type { CompletedChallenge } from "@/lib/challenges/types";

/**
 * Read-only Server Actions for the challenge parts of other screens. Row level security keeps
 * the queries to the signed-in reader; signed out they simply find nothing.
 */

/**
 * D4 preview "This completes 2 challenges": the challenges that finishing the book on
 * `finishedOn` (YYYY-MM-DD, empty = today) would complete. Invalid input previews nothing.
 */
export async function previewCompletedChallenges(
  bookId: string,
  finishedOn: string,
): Promise<CompletedChallenge[]> {
  const id = bookIdSchema.safeParse(bookId);
  const date = finishedOnSchema.safeParse(finishedOn);
  if (!id.success || !date.success) return [];
  return challengesCompletedBy(id.data, date.data);
}

/** E7 "8 challenges completed": the counter right after a read or a pick completed some. */
export async function completedChallengeCount(): Promise<number> {
  return countCompletedChallenges();
}
