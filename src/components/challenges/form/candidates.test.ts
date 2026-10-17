import { describe, expect, it } from "vitest";

import {
  addCandidate,
  type Candidate,
  candidateRows,
  hasEnoughCandidates,
  importCandidates,
  initialCandidates,
  removeCandidate,
  toggleCandidate,
  undoRemovePick,
} from "./candidates";

const book = (n: number): Candidate => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  title: `Book ${n}`,
  authors: [`Author ${n}`],
  coverUrl: null,
});
const ids = (books: Candidate[]) => books.map((b) => b.title);

describe("challenge form candidates (E6, E8)", () => {
  it("starts from the given books without duplicates", () => {
    const state = initialCandidates([book(1), book(2), book(1)]);
    expect(ids(state.books)).toEqual(["Book 1", "Book 2"]);
    expect(state.pickId).toBeNull();
  });

  it("only remembers the pick when it is a candidate", () => {
    expect(initialCandidates([book(1)], book(1).id).pickId).toBe(book(1).id);
    expect(initialCandidates([book(1)], book(9).id).pickId).toBeNull();
  });

  it("adds at the end and ignores a book that is already there", () => {
    let state = initialCandidates([book(1)]);
    state = addCandidate(state, book(2));
    expect(addCandidate(state, book(2))).toBe(state);
    expect(ids(state.books)).toEqual(["Book 1", "Book 2"]);
  });

  it("keeps only the fields a row needs", () => {
    const state = addCandidate(initialCandidates([]), {
      ...book(1),
      status: "read",
    } as Candidate);
    expect(Object.keys(state.books[0]).sort()).toEqual([
      "authors",
      "coverUrl",
      "id",
      "title",
    ]);
  });

  it("toggles a search result on and off", () => {
    let state = initialCandidates([]);
    state = toggleCandidate(state, book(1));
    expect(ids(state.books)).toEqual(["Book 1"]);
    state = toggleCandidate(state, book(1));
    expect(state.books).toEqual([]);
  });

  it("needs at least 5 books (P12)", () => {
    let state = initialCandidates([1, 2, 3, 4].map(book));
    expect(hasEnoughCandidates(state)).toBe(false);
    state = addCandidate(state, book(5));
    expect(hasEnoughCandidates(state)).toBe(true);
    state = removeCandidate(state, book(3).id);
    expect(hasEnoughCandidates(state)).toBe(false);
  });

  it("stops at 100 books", () => {
    const full = initialCandidates(
      Array.from({ length: 100 }, (_, i) => book(i)),
    );
    expect(addCandidate(full, book(500))).toBe(full);
  });

  it("imports a readlist in one go, skipping books already on the list", () => {
    const state = initialCandidates([book(1), book(2)]);
    const result = importCandidates(state, [
      book(2),
      book(3),
      book(4),
      book(3),
    ]);
    expect(ids(result.state.books)).toEqual([
      "Book 1",
      "Book 2",
      "Book 3",
      "Book 4",
    ]);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it("imports nothing when every book is already there", () => {
    const state = initialCandidates([book(1)]);
    const result = importCandidates(state, [book(1)]);
    expect(result.state).toBe(state);
    expect(result).toMatchObject({ added: 0, skipped: 1 });
  });

  describe("removing my pick (E8)", () => {
    const start = initialCandidates([1, 2, 3, 4, 5, 6].map(book), book(3).id);

    it("takes it off the list but keeps the row, marked removed", () => {
      const state = removeCandidate(start, book(3).id);
      expect(ids(state.books)).not.toContain("Book 3");
      expect(state.books).toHaveLength(5);
      expect(
        candidateRows(state).map((row) => [row.book.title, row.removed]),
      ).toEqual([
        ["Book 1", false],
        ["Book 2", false],
        ["Book 3", true],
        ["Book 4", false],
        ["Book 5", false],
        ["Book 6", false],
      ]);
    });

    it("Undo puts it back at its old place", () => {
      const state = undoRemovePick(removeCandidate(start, book(3).id));
      expect(ids(state.books)).toEqual(ids(start.books));
      expect(state.removedPick).toBeNull();
    });

    it("adding it again from the search is the same as Undo", () => {
      const state = addCandidate(removeCandidate(start, book(3).id), book(3));
      expect(ids(state.books)).toEqual(ids(start.books));
      expect(state.removedPick).toBeNull();
    });

    it("other books just disappear", () => {
      const state = removeCandidate(start, book(1).id);
      expect(state.removedPick).toBeNull();
      expect(candidateRows(state)).toHaveLength(5);
    });

    it("Undo without a removed pick changes nothing", () => {
      expect(undoRemovePick(start)).toBe(start);
    });
  });
});
