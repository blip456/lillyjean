import type { ChallengeState } from "@/lib/challenges/types";

/** E4 shows this many candidate books before "+ n more · Show all". */
export const CANDIDATE_PREVIEW = 4;

/**
 * The candidates E4 shows: my pick first (when it is a candidate), then the others in the order
 * they were added. Collapsed, only the first `limit` show and `hidden` says how many are left.
 */
export function candidatePreview<T extends { id: string }>(
  candidates: readonly T[],
  pickId: string | null,
  expanded: boolean,
  limit = CANDIDATE_PREVIEW,
): { shown: T[]; hidden: number } {
  const ordered = [
    ...candidates.filter((book) => book.id === pickId),
    ...candidates.filter((book) => book.id !== pickId),
  ];
  if (expanded || ordered.length <= limit) return { shown: ordered, hidden: 0 };
  return { shown: ordered.slice(0, limit), hidden: ordered.length - limit };
}

/** Picking is open while a challenge runs or has yet to start; completed ones are read-only. */
export function canPick(state: ChallengeState) {
  return state === "active" || state === "upcoming";
}

/**
 * What choosing `bookId` does: nothing when it is already my pick, pick it straight away when
 * nothing is picked yet, or replace my pick after a confirmation ("Replace your pick?").
 */
export function pickAction(
  bookId: string,
  pickId: string | null,
): "current" | "pick" | "replace" {
  if (pickId === bookId) return "current";
  return pickId ? "replace" : "pick";
}

/**
 * E5 opened from its challenge (E4) carries `?from=challenge`, so after "Use as my pick" the
 * browser can simply go back to E4. Opened any other way (a shared link, a fresh start), it
 * replaces itself with E4 instead of going back to a screen outside the challenge.
 */
export function ownPickFromChallengeHref(ownPickPath: string) {
  return `${ownPickPath}?from=challenge`;
}

/** Where "Add it manually" (D3) returns to: E5 again, keeping `from`. */
export function ownPickReturnTo(ownPickPath: string, fromChallenge: boolean) {
  return fromChallenge ? ownPickFromChallengeHref(ownPickPath) : ownPickPath;
}

/** One value of a search param, or "". */
export function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
