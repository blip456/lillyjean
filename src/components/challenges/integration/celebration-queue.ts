import type { CompletedChallenge } from "@/lib/challenges/types";

/**
 * What the completion celebration (E7) shows, one moment at a time: the challenges one book just
 * completed. One read can complete several (P10): they share one moment, the stamps land one
 * after the other and "This book also completed n other challenges" lists the rest.
 */
export type CelebrationMoment = {
  /** Unique per moment, so the screen restarts its animation for the next one. */
  key: number;
  bookTitle: string;
  challenges: CompletedChallenge[];
};

/**
 * Adds what a read or a pick just completed. Challenges that are already waiting or showing are
 * left out (a double call must not celebrate twice); several books become several moments.
 */
export function enqueue(
  queue: CelebrationMoment[],
  completed: CompletedChallenge[],
  nextKey: () => number,
): CelebrationMoment[] {
  const known = new Set(queue.flatMap((m) => m.challenges.map((c) => c.id)));
  const fresh = completed.filter(
    (challenge, index) =>
      !known.has(challenge.id) &&
      completed.findIndex((c) => c.id === challenge.id) === index,
  );
  if (!fresh.length) return queue;

  const byBook = new Map<string, CompletedChallenge[]>();
  for (const challenge of fresh)
    byBook.set(challenge.bookTitle, [
      ...(byBook.get(challenge.bookTitle) ?? []),
      challenge,
    ]);
  return [
    ...queue,
    ...[...byBook].map(([bookTitle, challenges]) => ({
      key: nextKey(),
      bookTitle,
      challenges,
    })),
  ];
}

/** The moment on screen, or null when there is nothing to celebrate. */
export function currentMoment(
  queue: CelebrationMoment[],
): CelebrationMoment | null {
  return queue[0] ?? null;
}

/** Done: on to the next moment, if any. */
export function dismiss(queue: CelebrationMoment[]) {
  return queue.slice(1);
}

/** The challenges listed under "This book also completed …": all but the headline one. */
export function otherChallenges(moment: CelebrationMoment) {
  return moment.challenges.slice(1);
}
