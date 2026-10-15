import { describe, expect, it } from "vitest";

import { firstError } from "@/lib/validation";

import { readlistSchema } from "./validation";

describe("readlistSchema", () => {
  it("trims the name and turns an empty description into null", () => {
    expect(
      readlistSchema.parse({ name: "  Winter reads ", description: " " }),
    ).toEqual({ name: "Winter reads", description: null });
  });

  it.each([
    ["", "readlistNameRequired"],
    ["   ", "readlistNameRequired"],
    ["x".repeat(61), "readlistNameTooLong"],
  ])("rejects the name %j", (name, key) => {
    const result = readlistSchema.safeParse({ name, description: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstError(result.error)).toBe(key);
  });

  it("limits the description to 500 characters", () => {
    const result = readlistSchema.safeParse({
      name: "Ok",
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(firstError(result.error)).toBe("readlistDescriptionTooLong");
  });
});
