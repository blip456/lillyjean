import { describe, expect, it } from "vitest";

import { PLEDGE_MAX, PLEDGE_MIN } from "@/lib/validation";

import { stepGoal } from "./pledge-goal";

describe("stepGoal (pledge − and + buttons)", () => {
  it("adds or takes one book", () => {
    expect(stepGoal("12", 1)).toBe("13");
    expect(stepGoal("12", -1)).toBe("11");
  });

  it("starts from the minimum when the field is empty", () => {
    expect(stepGoal("", 1)).toBe(String(PLEDGE_MIN));
    expect(stepGoal("", -1)).toBe(String(PLEDGE_MIN));
  });

  it("stays within the allowed range", () => {
    expect(stepGoal(String(PLEDGE_MIN), -1)).toBe(String(PLEDGE_MIN));
    expect(stepGoal(String(PLEDGE_MAX), 1)).toBe(String(PLEDGE_MAX));
    expect(stepGoal("5000", -1)).toBe(String(PLEDGE_MAX));
  });

  it("drops leading zeros", () => {
    expect(stepGoal("0200", 1)).toBe("201");
  });
});
