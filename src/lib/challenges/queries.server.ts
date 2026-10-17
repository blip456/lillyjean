import "server-only";

import { cache } from "react";

import { queueMissingCovers } from "@/lib/books/covers.server";
import {
  BOOK_WITH_MY_STATE,
  type BookWithMyState,
  toListItemWithState,
} from "@/lib/books/queries.server";
import { createClient } from "@/lib/supabase/server";

import { appToday, challengeState } from "./dates";
import type {
  BookChallenge,
  ChallengeDetail,
  ChallengeSummary,
  CompletedChallenge,
} from "./types";

type ChallengeRow = {
  id: string;
  kind: "personal";
  owner_id: string;
  title: string;
  theme: string | null;
  starts_on: string;
  ends_on: string | null;
  challenge_candidates: { book_id: string }[];
  /** Only my own membership (row level security), with the picked book and my state for it. */
  challenge_members: { books: BookWithMyState | null }[];
};

/**
 * My challenges with their candidate ids and my pick, in one round of parallel queries (T21):
 * the challenges embed the candidate ids and my picked book; the completion comes from the
 * `challenge_progress` view.
 */
const loadMine = cache(async () => {
  const supabase = await createClient();
  const [{ data: challenges }, { data: progress }] = await Promise.all([
    supabase
      .from("challenges")
      .select(
        `id, kind, owner_id, title, theme, starts_on, ends_on, challenge_candidates(book_id), challenge_members(books(${BOOK_WITH_MY_STATE}))`,
      )
      .order("starts_on", { ascending: true }),
    supabase.from("challenge_progress").select("challenge_id, completed_on"),
  ]);
  const rows = (challenges ?? []) as unknown as ChallengeRow[];
  const completed = new Map(
    (progress ?? []).map(
      (row) => [row.challenge_id, row.completed_on] as const,
    ),
  );
  const pickBooks = rows.flatMap((row) =>
    row.challenge_members.flatMap((m) => (m.books ? [m.books] : [])),
  );
  queueMissingCovers(pickBooks);

  const today = appToday();
  return rows.map((row) => {
    const candidateIds = row.challenge_candidates.map((c) => c.book_id);
    const pickRow = row.challenge_members[0]?.books;
    const pickBook = pickRow ? toListItemWithState(pickRow) : undefined;
    const completedOn = completed.get(row.id) ?? null;
    const summary: ChallengeSummary = {
      id: row.id,
      kind: row.kind,
      title: row.title,
      theme: row.theme,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      completedOn,
      state: challengeState(
        { startsOn: row.starts_on, endsOn: row.ends_on, completedOn },
        today,
      ),
      pick: pickBook
        ? { ...pickBook, isOwnPick: !candidateIds.includes(pickBook.id) }
        : null,
      candidateCount: candidateIds.length,
    };
    return { summary, ownerId: row.owner_id, candidateIds };
  });
});

/**
 * My challenges for the Challenges tab (E1, E3) and Home (B1). `active` holds running challenges
 * (ending soonest first, no end date last) and then upcoming ones (starting soonest first);
 * `past` holds completed ones, most recent first. Missed challenges are left out (P13).
 */
export async function getMyChallenges(): Promise<{
  active: ChallengeSummary[];
  past: ChallengeSummary[];
}> {
  const all = (await loadMine()).map((entry) => entry.summary);
  const running = all
    .filter((c) => c.state === "active")
    .sort((a, b) =>
      (a.endsOn ?? "9999-12-31").localeCompare(b.endsOn ?? "9999-12-31"),
    );
  const upcoming = all
    .filter((c) => c.state === "upcoming")
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const past = all
    .filter((c) => c.state === "completed")
    .sort((a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? ""));
  return { active: [...running, ...upcoming], past };
}

/** How many challenges I completed (counter on E1, E7, Home stats and the library card). */
export async function countCompletedChallenges(): Promise<number> {
  return (await loadMine()).filter(
    (entry) => entry.summary.state === "completed",
  ).length;
}

/** One challenge with its candidates (E4, E8). Null when it does not exist or is not mine. */
export const getChallenge = cache(
  async (id: string): Promise<ChallengeDetail | null> => {
    const supabase = await createClient();
    // One round (T21): my challenges, this challenge's candidates and who I am, in parallel.
    const [entries, { data: candidates }, { data: claims }] = await Promise.all(
      [
        loadMine(),
        supabase
          .from("challenge_candidates")
          .select(`added_at, books(${BOOK_WITH_MY_STATE})`)
          .eq("challenge_id", id)
          // Candidates added together share added_at; the book id keeps their order stable.
          .order("added_at", { ascending: true })
          .order("book_id", { ascending: true }),
        supabase.auth.getClaims(),
      ],
    );
    const entry = entries.find((e) => e.summary.id === id);
    if (!entry) return null;
    const books = (candidates ?? [])
      .map((row) => row.books as unknown as BookWithMyState | null)
      .filter((book): book is BookWithMyState => book !== null);
    queueMissingCovers(books);

    const { summary } = entry;
    return {
      ...summary,
      ownerId: entry.ownerId,
      isOwner: claims?.claims?.sub === entry.ownerId,
      started: summary.startsOn <= appToday(),
      canDelete:
        claims?.claims?.sub === entry.ownerId && summary.state !== "completed",
      candidates: books.map(toListItemWithState),
    };
  },
);

/** Open challenges (running or upcoming, not completed) that a book is part of. */
function openChallengesFor(
  entries: Awaited<ReturnType<typeof loadMine>>,
  bookId: string,
): BookChallenge[] {
  return entries
    .filter(
      ({ summary, candidateIds }) =>
        (summary.state === "active" || summary.state === "upcoming") &&
        (candidateIds.includes(bookId) || summary.pick?.id === bookId),
    )
    .map(({ summary, candidateIds }) => ({
      id: summary.id,
      title: summary.title,
      kind: summary.kind,
      startsOn: summary.startsOn,
      endsOn: summary.endsOn,
      state: summary.state,
      isCandidate: candidateIds.includes(bookId),
      isPick: summary.pick?.id === bookId,
      otherPickTitle:
        summary.pick && summary.pick.id !== bookId ? summary.pick.title : null,
    }));
}

/** "Fits your challenges" on the book page (D2): open challenges this book is part of. */
export async function getChallengesForBook(
  bookId: string,
): Promise<BookChallenge[]> {
  return openChallengesFor(await loadMine(), bookId);
}

/**
 * Challenge indicator (P25) for many books at once (D1 results, Home): book id → number of open
 * challenges the book is a candidate in or picked for. Books in none are left out.
 */
export async function getChallengeIndicators(
  bookIds: string[],
): Promise<Record<string, number>> {
  const entries = await loadMine();
  const counts: Record<string, number> = {};
  for (const id of bookIds) {
    const count = openChallengesFor(entries, id).length;
    if (count) counts[id] = count;
  }
  return counts;
}

/**
 * The challenges that finishing `bookId` on `finishedOn` (YYYY-MM-DD) would complete (D4
 * preview "This completes 2 challenges", E7 after saving): open challenges where it is my pick
 * and the date is inside the window (P10, P13).
 */
export async function challengesCompletedBy(
  bookId: string,
  finishedOn: string,
): Promise<CompletedChallenge[]> {
  return (await loadMine())
    .map((entry) => entry.summary)
    .filter(
      (c) =>
        (c.state === "active" || c.state === "upcoming") &&
        c.pick?.id === bookId &&
        c.startsOn <= finishedOn &&
        (!c.endsOn || finishedOn <= c.endsOn),
    )
    .map((c) => ({ id: c.id, title: c.title, bookTitle: c.pick!.title }));
}
