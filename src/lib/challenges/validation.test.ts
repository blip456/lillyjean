import { describe, expect, it } from "vitest";

import { challengeSchema } from "./validation";

const ids = [
  "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d01",
  "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d02",
  "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d03",
  "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d04",
  "0b6f8f5e-2c55-4d7e-9b1a-4b7c3f1e2d05",
];
const valid = {
  title: " Summer classics ",
  theme: "",
  startsOn: "2026-10-15",
  endsOn: "",
  bookIds: ids,
};
const errorsOf = (input: object) => {
  const result = challengeSchema.safeParse({ ...valid, ...input });
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("challengeSchema", () => {
  it("accepts a title, a start date and 5 books; trims, and empty means none", () => {
    const result = challengeSchema.parse(valid);
    expect(result).toMatchObject({
      title: "Summer classics",
      theme: null,
      startsOn: "2026-10-15",
      endsOn: null,
    });
    expect(result.bookIds).toHaveLength(5);
  });

  it("needs a title of at most 80 characters", () => {
    expect(errorsOf({ title: "  " })).toContain("challengeTitleRequired");
    expect(errorsOf({ title: "x".repeat(81) })).toContain(
      "challengeTitleTooLong",
    );
  });

  it("limits the theme to 300 characters", () => {
    expect(errorsOf({ theme: "x".repeat(301) })).toContain(
      "challengeThemeTooLong",
    );
  });

  it("needs a real start date", () => {
    expect(errorsOf({ startsOn: "" })).toContain("challengeStartRequired");
    expect(errorsOf({ startsOn: "2026-02-30" })).toContain(
      "challengeDateInvalid",
    );
  });

  it("does not allow an end date before the start", () => {
    expect(errorsOf({ endsOn: "2026-10-14" })).toContain(
      "challengeEndBeforeStart",
    );
    expect(errorsOf({ endsOn: "2026-10-15" })).toEqual([]);
  });

  it("needs at least 5 different books (P12)", () => {
    expect(errorsOf({ bookIds: ids.slice(0, 4) })).toContain(
      "challengeTooFewCandidates",
    );
    expect(errorsOf({ bookIds: [...ids.slice(0, 4), ids[0]] })).toContain(
      "challengeTooFewCandidates",
    );
  });
});
