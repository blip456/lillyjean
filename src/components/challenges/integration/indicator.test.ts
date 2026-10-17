import { describe, expect, it } from "vitest";

import { indicatorFor } from "./indicator";

const pick = { isPick: true, isCandidate: true };
const ownPick = { isPick: true, isCandidate: false };
const candidate = { isPick: false, isCandidate: true };

describe("indicatorFor", () => {
  it("shows nothing for a book outside my challenges", () => {
    expect(indicatorFor([])).toBeNull();
  });

  it("says 'Part of' when the book is my pick, also as an own pick", () => {
    expect(indicatorFor([pick])).toEqual({ kind: "pick", count: 1 });
    expect(indicatorFor([ownPick, pick])).toEqual({ kind: "pick", count: 2 });
  });

  it("says 'Candidate in' when it is only a candidate", () => {
    expect(indicatorFor([candidate, candidate])).toEqual({
      kind: "candidate",
      count: 2,
    });
  });

  it("counts only the picks when it is also a candidate elsewhere", () => {
    expect(indicatorFor([candidate, pick, candidate])).toEqual({
      kind: "pick",
      count: 1,
    });
  });
});
