/**
 * Pace against the yearly reading pledge (Home stats, B1): compares the books read so far with
 * what the pledge asks for by today, based on the share of the year that has passed.
 */
export type Pace =
  | { kind: "reached" }
  | { kind: "onTrack" }
  | { kind: "ahead"; books: number }
  | { kind: "behind"; books: number };

const DAY = 24 * 60 * 60 * 1000;

/** Share of the calendar year that has passed at the end of `date`'s day (0 < share ≤ 1). */
export function yearElapsed(date: Date): number {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const next = new Date(year + 1, 0, 1);
  const today = new Date(year, date.getMonth(), date.getDate());
  // Math.round absorbs the hour lost or gained with daylight saving time.
  const daysInYear = Math.round((next.getTime() - start.getTime()) / DAY);
  const daysPassed = Math.round((today.getTime() - start.getTime()) / DAY) + 1;
  return daysPassed / daysInYear;
}

/**
 * Whole books ahead of or behind the pledge. Less than one book difference counts as on track,
 * and a reached pledge is reported as such, however early in the year.
 */
export function readingPace(read: number, goal: number, date: Date): Pace {
  if (read >= goal) return { kind: "reached" };
  const difference = read - goal * yearElapsed(date);
  const books = Math.floor(Math.abs(difference));
  if (books === 0) return { kind: "onTrack" };
  return difference > 0 ? { kind: "ahead", books } : { kind: "behind", books };
}
