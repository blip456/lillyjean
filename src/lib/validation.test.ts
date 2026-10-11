import { describe, expect, it } from "vitest";

import {
  codeSchema,
  emailSchema,
  feedbackSchema,
  firstError,
  passwordSchema,
  pledgeSchema,
  usernameSchema,
} from "./validation";

describe("usernameSchema", () => {
  it("accepts the allowed characters and lowercases input", () => {
    expect(usernameSchema.parse("Reader.One_2")).toBe("reader.one_2");
  });

  it.each(["ab", "a".repeat(21), "with space", "dash-name", "émile"])(
    "rejects %s",
    (value) => {
      const result = usernameSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(firstError(result.error)).toBe("usernameFormat");
    },
  );
});

describe("passwordSchema", () => {
  it("needs at least 12 characters and allows spaces", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("four words of text").success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Name@Example.TEST ")).toBe("name@example.test");
  });

  it("rejects invalid addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("codeSchema", () => {
  it("accepts six digits, also when pasted with spaces", () => {
    expect(codeSchema.parse("123 456")).toBe("123456");
  });

  it("rejects anything else", () => {
    expect(codeSchema.safeParse("12345").success).toBe(false);
    expect(codeSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("pledgeSchema", () => {
  it("accepts whole numbers from 1 to 999", () => {
    expect(pledgeSchema.parse("24")).toBe(24);
    expect(pledgeSchema.safeParse("0").success).toBe(false);
    expect(pledgeSchema.safeParse("1000").success).toBe(false);
    expect(pledgeSchema.safeParse("2.5").success).toBe(false);
  });
});

describe("feedbackSchema", () => {
  it("rejects empty feedback", () => {
    const result = feedbackSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) expect(firstError(result.error)).toBe("feedbackEmpty");
  });
});
