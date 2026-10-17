import "server-only";

import { getChallenge } from "@/lib/challenges/queries.server";
import { challengeIdSchema } from "@/lib/challenges/validation";

/**
 * A challenge of mine for E4 and E5, or null: an invalid or unknown id, someone else's challenge
 * and a missed challenge (ended without a completion: it disappears, P13) all give the
 * not-found page.
 */
export async function findChallenge(id: string) {
  if (!challengeIdSchema.safeParse(id).success) return null;
  const challenge = await getChallenge(id);
  if (!challenge || challenge.state === "missed") return null;
  return challenge;
}
