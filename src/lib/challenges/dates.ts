/**
 * Dates of challenges. Dates are calendar days (YYYY-MM-DD). Lillyjean's readers are in Belgium,
 * so "today" on the server is the Brussels date; in the browser it is the reader's own date.
 */

import type { ChallengeState } from "./types";

export const APP_TIME_ZONE = "Europe/Brussels";

/** Today as YYYY-MM-DD in the app's time zone (server-side labels and states). */
export function appToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Where a challenge stands on `today` (P13): completed wins; after the end it is missed. */
export function challengeState(
  challenge: {
    startsOn: string;
    endsOn: string | null;
    completedOn: string | null;
  },
  today: string,
): ChallengeState {
  if (challenge.completedOn) return "completed";
  if (challenge.endsOn && challenge.endsOn < today) return "missed";
  if (challenge.startsOn > today) return "upcoming";
  return "active";
}

/**
 * The time label on a card: "Starts in 5 days", "Ends in 12 days", "No end date". Returns a
 * translation key under `challenges.when` and the day count for it.
 */
export function whenLabel(
  challenge: { startsOn: string; endsOn: string | null },
  today: string,
): { key: "startsIn" | "endsIn" | "noEnd"; days: number } {
  if (challenge.startsOn > today)
    return { key: "startsIn", days: daysBetween(today, challenge.startsOn) };
  if (challenge.endsOn)
    return { key: "endsIn", days: daysBetween(today, challenge.endsOn) };
  return { key: "noEnd", days: 0 };
}
