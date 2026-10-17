import type { BookListItem } from "@/lib/books/types";

/** Where a challenge stands for me today (P13). Missed challenges are not shown anywhere. */
export type ChallengeState = "upcoming" | "active" | "completed" | "missed";

/** A challenge in a list (E1, E3, Home B1): enough for the card. */
export type ChallengeSummary = {
  id: string;
  /** Personal only in Sprint 5; official (S6) and shared (S8) follow. */
  kind: "personal";
  title: string;
  theme: string | null;
  /** YYYY-MM-DD. */
  startsOn: string;
  endsOn: string | null;
  state: ChallengeState;
  /** My pick, with my status for it; null = no book picked yet. */
  pick: (BookListItem & { isOwnPick: boolean }) | null;
  /** YYYY-MM-DD of the read that completed it (first one inside the window). */
  completedOn: string | null;
  candidateCount: number;
};

/** One challenge with its candidates (E4, E8). */
export type ChallengeDetail = ChallengeSummary & {
  ownerId: string;
  isOwner: boolean;
  /** Started (start date today or earlier): title and theme are locked (P49). */
  started: boolean;
  /** The creator can delete it while it is not completed (P50). */
  canDelete: boolean;
  /** The candidate books with my status, in the order they were added. */
  candidates: BookListItem[];
};

/** A challenge that a read or a pick just completed: what the celebration (E7) shows. */
export type CompletedChallenge = {
  id: string;
  title: string;
  bookTitle: string;
};

/** A challenge a book is part of (indicator on D1, Home; "Fits your challenges" on D2). */
export type BookChallenge = {
  id: string;
  title: string;
  kind: "personal";
  startsOn: string;
  endsOn: string | null;
  state: ChallengeState;
  /** This book is a candidate in the challenge. */
  isCandidate: boolean;
  /** This book is my pick. */
  isPick: boolean;
  /** Title of my current pick when it is another book; null when nothing is picked. */
  otherPickTitle: string | null;
};
