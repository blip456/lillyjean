import { describe, expect, it } from "vitest";

import {
  cleanAuthors,
  cleanCoverUrl,
  cleanDescription,
  cleanText,
  cleanYear,
  looksLikeIsbn,
  normalizeIsbn,
  pickIsbn,
} from "./sanitize";

describe("normalizeIsbn", () => {
  it.each([
    ["978-0-14-143951-8", "9780141439518"],
    ["0 14 143951 3", "0141439513"],
    ["080442957X", "080442957X"],
    ["080442957x", "080442957X"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeIsbn(input)).toBe(expected);
  });

  it.each(["9780141439519", "0141439514", "12345", "", null, "pride"])(
    "rejects %s",
    (input) => {
      expect(normalizeIsbn(input)).toBeNull();
    },
  );

  it("recognises an ISBN typed as a search", () => {
    expect(looksLikeIsbn("978 0141439518")).toBe(true);
    expect(looksLikeIsbn("1984")).toBe(false);
  });

  it("prefers a valid ISBN-13", () => {
    expect(pickIsbn(["0141439513", "9780000000000", "9780141439518"])).toBe(
      "9780141439518",
    );
    expect(pickIsbn(["0141439513"])).toBe("0141439513");
    expect(pickIsbn([])).toBeNull();
  });
});

describe("cleaning book data", () => {
  it("collapses whitespace and shortens long text", () => {
    expect(cleanText("  A   title \n", 300)).toBe("A title");
    expect(cleanText("abcdef", 4)).toBe("abc…");
    expect(cleanText("   ", 10)).toBeNull();
    expect(cleanText(42, 10)).toBeNull();
  });

  it("drops HTML and Open Library source blocks from descriptions", () => {
    expect(
      cleanDescription("<p>First &amp; best.</p><p>Second<br>line</p>"),
    ).toBe("First & best.\n\nSecond\nline");
    expect(
      cleanDescription("The story.\n----------\nAlso contained in: ..."),
    ).toBe("The story.");
    expect(cleanDescription(undefined)).toBeNull();
  });

  it("keeps unique, non-empty authors (at most 20)", () => {
    expect(cleanAuthors(["A", " A ", "", null, "B"])).toEqual(["A", "B"]);
    expect(
      cleanAuthors(Array.from({ length: 30 }, (_, i) => `A${i}`)),
    ).toHaveLength(20);
    expect(cleanAuthors("A")).toEqual([]);
  });

  it("only keeps https cover URLs", () => {
    expect(cleanCoverUrl("http://books.google.com/x.jpg")).toBe(
      "https://books.google.com/x.jpg",
    );
    expect(cleanCoverUrl("javascript:alert(1)")).toBeNull();
    expect(cleanCoverUrl("")).toBeNull();
  });

  it("accepts plausible years", () => {
    expect(cleanYear(1813)).toBe(1813);
    expect(cleanYear("2004-05-01".slice(0, 4))).toBe(2004);
    expect(cleanYear(-5)).toBeNull();
    expect(cleanYear("unknown")).toBeNull();
  });
});
