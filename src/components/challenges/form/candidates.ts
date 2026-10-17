import { MAX_CANDIDATES, MIN_CANDIDATES } from "@/lib/challenges/validation";

/** A candidate book in the challenge form (E6, E8): what a row shows. */
export type Candidate = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
};

/**
 * The candidate list of the form. `removedPick` is my pick when I took it off the list: it stays
 * my pick (P13), so the row stays visible with Undo, at its old place (`index`).
 */
export type CandidatesState = {
  books: Candidate[];
  /** Id of my pick when it is one of the candidates; null when there is none. */
  pickId: string | null;
  removedPick: { book: Candidate; index: number } | null;
};

export function initialCandidates(
  books: Candidate[],
  pickId: string | null = null,
): CandidatesState {
  return {
    books: dedupe(books),
    pickId: pickId && books.some((book) => book.id === pickId) ? pickId : null,
    removedPick: null,
  };
}

function dedupe(books: Candidate[]) {
  const seen = new Set<string>();
  return books.filter((book) => !seen.has(book.id) && seen.add(book.id));
}

const pick = ({ id, title, authors, coverUrl }: Candidate): Candidate => ({
  id,
  title,
  authors,
  coverUrl,
});

export function hasCandidate(state: CandidatesState, id: string) {
  return state.books.some((book) => book.id === id);
}

/** Enough candidates to create or save (P12). */
export function hasEnoughCandidates(state: CandidatesState) {
  return state.books.length >= MIN_CANDIDATES;
}

/** Adds a book at the end; no-op when it is already there or the list is full. */
export function addCandidate(
  state: CandidatesState,
  book: Candidate,
): CandidatesState {
  if (hasCandidate(state, book.id) || state.books.length >= MAX_CANDIDATES)
    return state;
  // Adding my removed pick again is the same as Undo: back at its old place.
  if (state.removedPick?.book.id === book.id) return undoRemovePick(state);
  return { ...state, books: [...state.books, pick(book)] };
}

/** Takes a book off the list. My pick stays visible as "Removed · stays your pick" with Undo. */
export function removeCandidate(
  state: CandidatesState,
  id: string,
): CandidatesState {
  const index = state.books.findIndex((book) => book.id === id);
  if (index < 0) return state;
  const books = state.books.filter((book) => book.id !== id);
  if (id !== state.pickId) return { ...state, books };
  return { ...state, books, removedPick: { book: state.books[index], index } };
}

/** Puts a removed pick back where it was. */
export function undoRemovePick(state: CandidatesState): CandidatesState {
  const removed = state.removedPick;
  if (!removed || state.books.length >= MAX_CANDIDATES) return state;
  const books = [...state.books];
  books.splice(Math.min(removed.index, books.length), 0, removed.book);
  return { ...state, books, removedPick: null };
}

/** Tap on a search result: adds it, or removes it when it is already a candidate. */
export function toggleCandidate(
  state: CandidatesState,
  book: Candidate,
): CandidatesState {
  return hasCandidate(state, book.id)
    ? removeCandidate(state, book.id)
    : addCandidate(state, book);
}

/**
 * "Import from a readlist": adds all its books in one go, in the readlist's order, skipping the
 * ones already on the list (and stopping at the maximum).
 */
export function importCandidates(
  state: CandidatesState,
  books: Candidate[],
): { state: CandidatesState; added: number; skipped: number } {
  let next = state;
  let added = 0;
  for (const book of dedupe(books)) {
    const after = addCandidate(next, book);
    if (after !== next) added += 1;
    next = after;
  }
  return { state: next, added, skipped: dedupe(books).length - added };
}

/**
 * The rows to show: the candidates, with my removed pick back at its old place, marked removed.
 */
export function candidateRows(
  state: CandidatesState,
): { book: Candidate; removed: boolean }[] {
  const rows = state.books.map((book) => ({ book, removed: false }));
  if (state.removedPick) {
    const { book, index } = state.removedPick;
    rows.splice(Math.min(index, rows.length), 0, { book, removed: true });
  }
  return rows;
}
