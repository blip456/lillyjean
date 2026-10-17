import { describe, expect, it } from "vitest";

import { challengeHref, editChallengeHref, ownPickHref } from "./links";

describe("challenge links", () => {
  it("builds the challenge URLs", () => {
    expect(challengeHref("abc")).toBe("/challenges/abc");
    expect(editChallengeHref("abc")).toBe("/challenges/abc/edit");
    expect(ownPickHref("abc")).toBe("/challenges/abc/pick");
  });
});
