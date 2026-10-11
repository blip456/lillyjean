import { describe, expect, it } from "vitest";

import { firstError } from "@/lib/validation";

import { goodreadsUrl } from "./links";
import {
  finishedOnSchema,
  localDate,
  manualBookSchema,
  progressSchema,
} from "./validation";

describe("finishedOnSchema", () => {
  it("defaults to today", () => {
    expect(finishedOnSchema.parse("")).toBe(localDate());
  });

  it("accepts a past date", () => {
    expect(finishedOnSchema.parse("2026-03-01")).toBe("2026-03-01");
  });

  it.each([
    ["2026-02-30", "finishedOnInvalid"],
    ["01/03/2026", "finishedOnInvalid"],
    ["1899-12-31", "finishedOnInvalid"],
    ["2999-01-01", "finishedOnFuture"],
  ])("rejects %s", (value, key) => {
    const result = finishedOnSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) expect(firstError(result.error)).toBe(key);
  });
});

describe("progressSchema", () => {
  it("allows empty and 0–100", () => {
    expect(progressSchema.parse(null)).toBeNull();
    expect(progressSchema.parse(0)).toBe(0);
    expect(progressSchema.parse(100)).toBe(100);
  });

  it.each([-1, 101, 12.5])("rejects %s", (value) => {
    expect(progressSchema.safeParse(value).success).toBe(false);
  });
});

describe("manualBookSchema (D-PO2: title and author required)", () => {
  const valid = {
    title: " My Find ",
    author: "Small Press Author",
    isbn: "",
    description: "",
    status: "want_to_read",
  };

  it("trims input and turns empty optional fields into null", () => {
    expect(manualBookSchema.parse(valid)).toEqual({
      title: "My Find",
      author: "Small Press Author",
      isbn: null,
      description: null,
      status: "want_to_read",
    });
  });

  it("needs a title and an author", () => {
    const result = manualBookSchema.safeParse({
      ...valid,
      title: " ",
      author: "",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((i) => i.message)).toEqual([
        "titleRequired",
        "authorRequired",
      ]);
  });

  it("checks the ISBN", () => {
    expect(
      manualBookSchema.parse({ ...valid, isbn: "978-0-14-143951-8" }).isbn,
    ).toBe("9780141439518");
    const result = manualBookSchema.safeParse({ ...valid, isbn: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstError(result.error)).toBe("isbnInvalid");
  });
});

describe("goodreadsUrl", () => {
  it("links by ISBN when known, otherwise searches", () => {
    expect(
      goodreadsUrl({ isbn: "9780141439518", title: "Emma", authors: [] }),
    ).toBe("https://www.goodreads.com/book/isbn/9780141439518");
    expect(
      goodreadsUrl({ isbn: null, title: "Emma", authors: ["Jane Austen"] }),
    ).toBe("https://www.goodreads.com/search?q=Emma+Jane+Austen");
  });
});
