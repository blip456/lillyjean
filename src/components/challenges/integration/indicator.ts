import type { BookChallenge } from "@/lib/challenges/types";

/**
 * The challenge indicator on a book (P25: D1 results, Home's Currently reading, D2):
 * - "Part of n challenges" when the book is my pick in n open challenges: finishing it counts;
 * - "Candidate in n challenges" when it is only a candidate: it fits, but I have not chosen it.
 * A pick wins over candidacies, because that is what reading the book changes.
 */
export type ChallengeIndicator = { kind: "pick" | "candidate"; count: number };

export function indicatorFor(
  challenges: Pick<BookChallenge, "isPick" | "isCandidate">[],
): ChallengeIndicator | null {
  const picks = challenges.filter((c) => c.isPick).length;
  if (picks) return { kind: "pick", count: picks };
  const candidates = challenges.filter((c) => c.isCandidate).length;
  return candidates ? { kind: "candidate", count: candidates } : null;
}
