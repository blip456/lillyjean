import { describe, expect, it } from "vitest";

import {
  candidatePreview,
  canPick,
  firstParam,
  ownPickFromChallengeHref,
  ownPickReturnTo,
  pickAction,
} from "./challenge-view";

const books = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((book) => book.id);

describe("candidatePreview", () => {
  it("shows 4 and counts the rest (+ n more)", () => {
    const { shown, hidden } = candidatePreview(books, null, false);
    expect(ids(shown)).toEqual(["a", "b", "c", "d"]);
    expect(hidden).toBe(2);
  });

  it("shows everything once expanded", () => {
    const { shown, hidden } = candidatePreview(books, null, true);
    expect(ids(shown)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(hidden).toBe(0);
  });

  it("puts my pick first, so it is always in the preview", () => {
    const { shown, hidden } = candidatePreview(books, "f", false);
    expect(ids(shown)).toEqual(["f", "a", "b", "c"]);
    expect(hidden).toBe(2);
  });

  it("has nothing to hide with 4 or fewer, and ignores an own pick", () => {
    const { shown, hidden } = candidatePreview(books.slice(0, 4), "x", false);
    expect(ids(shown)).toEqual(["a", "b", "c", "d"]);
    expect(hidden).toBe(0);
  });

  it("hides exactly one with 5 candidates", () => {
    expect(candidatePreview(books.slice(0, 5), null, false).hidden).toBe(1);
  });
});

describe("canPick", () => {
  it("allows picking while running or upcoming only", () => {
    expect(canPick("active")).toBe(true);
    expect(canPick("upcoming")).toBe(true);
    expect(canPick("completed")).toBe(false);
    expect(canPick("missed")).toBe(false);
  });
});

describe("pickAction", () => {
  it("picks at once without a pick, asks before replacing one", () => {
    expect(pickAction("a", null)).toBe("pick");
    expect(pickAction("a", "b")).toBe("replace");
    expect(pickAction("a", "a")).toBe("current");
  });
});

describe("own pick links", () => {
  it("marks E5 opened from its challenge and keeps it through manual entry", () => {
    expect(ownPickFromChallengeHref("/challenges/a/pick")).toBe(
      "/challenges/a/pick?from=challenge",
    );
    expect(ownPickReturnTo("/challenges/a/pick", true)).toBe(
      "/challenges/a/pick?from=challenge",
    );
    expect(ownPickReturnTo("/challenges/a/pick", false)).toBe(
      "/challenges/a/pick",
    );
  });
});

describe("firstParam", () => {
  it("takes the first value of a search param", () => {
    expect(firstParam(undefined)).toBe("");
    expect(firstParam("x")).toBe("x");
    expect(firstParam(["y", "z"])).toBe("y");
  });
});
