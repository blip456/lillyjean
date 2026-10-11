import { describe, expect, it } from "vitest";

import { readingPace, yearElapsed } from "./pace";

const day = (year: number, month: number, date: number) =>
  new Date(year, month - 1, date, 12);

describe("yearElapsed", () => {
  it("counts today as passed", () => {
    expect(yearElapsed(day(2026, 1, 1))).toBeCloseTo(1 / 365);
  });

  it("is the whole year on 31 December", () => {
    expect(yearElapsed(day(2026, 12, 31))).toBe(1);
  });

  it("handles leap years", () => {
    expect(yearElapsed(day(2028, 12, 31))).toBe(1);
    expect(yearElapsed(day(2028, 2, 29))).toBeCloseTo(60 / 366);
  });

  it("does not depend on the time of day", () => {
    expect(yearElapsed(new Date(2026, 6, 1, 0, 0))).toBe(
      yearElapsed(new Date(2026, 6, 1, 23, 59)),
    );
  });
});

describe("readingPace", () => {
  // 2 July 2026 is day 183 of 365: half of a 24-book pledge is about 12 books.
  const midYear = day(2026, 7, 2);

  it("is on track within one book of the expected count", () => {
    expect(readingPace(12, 24, midYear)).toEqual({ kind: "onTrack" });
    expect(readingPace(13, 24, midYear)).toEqual({ kind: "onTrack" });
    expect(readingPace(11, 24, midYear)).toEqual({ kind: "behind", books: 1 });
  });

  it("counts whole books ahead", () => {
    expect(readingPace(14, 24, midYear)).toEqual({ kind: "ahead", books: 1 });
    expect(readingPace(15, 24, midYear)).toEqual({ kind: "ahead", books: 2 });
  });

  it("counts whole books behind", () => {
    expect(readingPace(9, 24, midYear)).toEqual({ kind: "behind", books: 3 });
    expect(readingPace(0, 24, midYear)).toEqual({ kind: "behind", books: 12 });
  });

  it("is on track at the start of the year", () => {
    expect(readingPace(0, 12, day(2026, 1, 3))).toEqual({ kind: "onTrack" });
  });

  it("reports a reached pledge, also when it is passed", () => {
    expect(readingPace(24, 24, midYear)).toEqual({ kind: "reached" });
    expect(readingPace(30, 24, day(2026, 3, 1))).toEqual({ kind: "reached" });
  });

  it("is behind by the missing books on the last day", () => {
    expect(readingPace(20, 24, day(2026, 12, 31))).toEqual({
      kind: "behind",
      books: 4,
    });
  });
});
